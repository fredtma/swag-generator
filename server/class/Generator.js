'use strict';
const CAMEL   = require('camelcase');
const COLORS  = require('colors');
const HELPER  = require('./Helper');
const FS      = require('fs');
const PROMPT  = require('prompt');
const STDIN   = process.stdin;
const STDOUT  = process.stdout;

module.exports = class Generator {

  constructor() {
    this.config = require('../config.json');

    console.info('Swagger Generator will generate the basic swagger for your application.' +
      '\n\rEnsure that the .\\server\\config.json file has the correct path to your application'.green.bold);

    this.readSwaggerName().then(()=> {
      let definitions = this.createDefinitions();
      let parameters  = this.createParameters();
      let tags        = this.createTags();

      Promise.all([definitions, parameters, tags]).then(value => {
        let pass = true;
        value.forEach(val=> pass= (pass!==true)? pass: val);

        if(pass===true) this.createPaths();
        else console.error("One or more swagger failed to generat".red, pass);
      }, err => console.error(err));
    });
  }

  createDefinitions() {
    return new Promise((resolve, reject) => {
      let definition = {};
      let definitionsKeys = [`${this.Name}Body`,`${this.Name}BodyResponse`,`${this.Name}ListResponse`];

      definitionsKeys.forEach(definitionKey => {
        let properties = {};
        if(definitionKey.indexOf('List')!==-1){
          properties = { [`${this.name}`]: { type: 'array', items:{ properties:{ type:'object'} } }};
        } else {
          properties = { [`${this.name}Id`]: { type: 'string'}};
        }
        definition[definitionKey] = {
          properties,
          required: [`${this.name}Id`]
        };
      });

      let content = `'use strict';
module.exports = ${JSON.stringify(definition)};
`.replace(/"/ig,"'");
      this.writeTo(`${this.config.dir.swagger}definitions/${this.name}.js`, content).then(result => {
        resolve(result);
      });
    });
  }

  createParameters() {
    return new Promise((resolve, reject)=>{
      let parameter = {};
      let parametersKeys = [`${this.name}Path`,`${this.name}Query`];

      parametersKeys.forEach(parameterKey => {
        let inOpt = parameterKey.replace(this.name, '').toLowerCase();
        parameter[parameterKey] = {
          name: `${this.name}Id`,
          in: inOpt,
          description: `The ${this.name}Id to get/add/update`,
          required: true,
          type: 'string'
        };
      });
      let content = `'use strict';
module.exports = ${JSON.stringify(parameter)};
`.replace(/"/ig,"'");
      this.writeTo(`${this.config.dir.swagger}parameters/${this.name}.js`, content).then(result=> {
        resolve(result);
      });
    });
  }

  createTags() {
    return new Promise((resolve, reject)=>{
      let tag = {
        name: this.name,
        description: `CRUD operations for ${this.Name}`
      };
      let content = `'use strict';
module.exports = ${JSON.stringify(tag)};
`.replace(/"/ig,"'");
      this.writeTo(`${this.config.dir.swagger}tags/${this.name}.js`, content).then(result=> {
        resolve(result);
      });
    });
  }

  createPaths() {
    return new Promise((resolve, reject)=>{
      let path = {};
      let pathsKeys = {
        [`/${this.name}`]:                  {methods:['post','get'], controller: `${this.name}Controller`, alternate:'gets'},
        [`/${this.name}/{${this.name}Id}`]: {methods:['put','get'], controller: `${this.name}Controller`},
        [`/${this.name}/lookup`]:           {methods:['get'], controller: `${this.name}LookupController`, alternate:'lookup'}
      };

      for(let key in pathsKeys){
        if(pathsKeys.hasOwnProperty(key)) {
          let node  = pathsKeys[key];
          path[key] = {'x-swagger-router-controller': node.controller};
          node.methods.forEach(method=>{
            path[key][method] = this.methodCall(method, node.alternate||null, node.options||{});
          });
        }
      }
      let content = `'use strict';
module.exports = ${JSON.stringify(path)};
`.replace(/"/ig,"'");
      this.writeTo(`${this.config.dir.swagger}paths/${this.name}.js`, content).then(result=> {
        resolve(result);
      });
    });
  }

  methodCall(method, alternate, options) {

    if(alternate==='gets' && method==='get') method = alternate;//this is for gets => lists
    function description() {
      switch(method){
        case 'get': return `Get details of a ${this.name}`;
        case 'gets': return `Get the list of ${this.name}s`;
        case 'post': return `save record for ${this.name}`;
        case 'put': return `update the specific ${this.name}`;
        case 'delete': return 'Delete record';
      }
    }

    function parameters() {
      let params = [
        {
          '$ref': '#/parameters/TokenHeader'
        },
        {
          'name': `${this.name}Id`,
          'description': `The id for the ${this.name}`,
          'in': 'path',
          'required': true,
          'type': 'string'
        }
      ];
      let paramsWithList = [
        {
          'name': 'searchText',
          'in': 'query',
          'description': 'Only include notes that match the search text',
          'required': false,
          'type': 'string'
        },
        {
          'name': 'order',
          'in': 'query',
          'description': 'Order the notes list ascending or descending',
          'required': false,
          'type': 'string',
          'enum': ['asc', 'desc'],
          'default': 'asc'
        },
        {
          'name': 'orderByType',
          'in': 'query',
          'description': 'Order the note list by this property',
          'required': false,
          'type': 'string',
          'enum': ['name', 'note'],
          'default': 'name'
        },
        {
          'name': 'skip',
          'in': 'query',
          'description': 'Skip this many notes in the list, used for progressive loading or pagination',
          'required': false,
          'type': 'integer',
          'minimum': 0,
          'default': 0
        },
        {
          'name': 'take',
          'in': 'query',
          'description': 'Only return this many note',
          'required': false,
          'type': 'integer',
          'minimum': 10,
          'default': 10
        }
      ];
      let body = {
        'name': `${this.name}Detail`,
        'in': 'body',
        'description': `A ${this.name} detail to add`,
        'required': true,
        'schema': {
          '$ref': `#/definitions/${this.Name}Body`
        }
      };
      switch(method){
        case 'gets': params = params.concat(paramsWithList); break;
        case 'post': params[1] = body; break;
        case 'put': params.push(body); break;
        default: break;
      }
      return params;
    }

    function responses() {
      let response = {
        '200':{
          'description': 'Success',
          'schema': {
            '$ref': `#/definitions/${this.Name}BodyResponse`
          },
          'examples': {
            'application/json': {
              [`${this.name}`]: {
                [`${this.name}Id`]: '1', 'created_at': '2016-07-04', 'updated_at': '2016-07-11'
              }
            }
          }
        }
      }//responses
      switch(method){
        case 'get': break;
        case 'gets':
          response[200].schema['$ref'] = `#/definitions/${this.Name}ListResponse`;
          response[200].examples['application/json'][`${this.name}`]    = [{[`${this.name}Id`]: '1', 'created_at': '2016-07-04', 'updated_at': '2016-07-11'}];
          response[200].examples['application/json'].countTotal         = 1;
          response[200].examples['application/json'].countTotalFiltered = 1;
          break;
        case 'post': break;
        case 'put': break;
        case 'delete': break;
      }
      return response;
    }

    function tags() {
      tags = [this.name];
      tags.push( (method==='post')? 'add': (method==='gets')? 'get': method );
      return tags;
    }

    return {
      tags: tags.call(this),
      description: description.call(this),
      parameters: parameters.call(this),
      responses: responses.call(this)
    };
  }

  readSwaggerName() {
    return new Promise((resolve, reject)=> {

        let schema = {
          properties: {
            name: {
              pattern: /^[a-z0-9\ \-\_]+$/ig,
              description: 'Specify the name of the Swagger',
              message: 'The name must alpha numeric',
              require: true
            }
          }
        };
        PROMPT.start();
        PROMPT.get(schema, (err, result)=> {
          if (err) {
            return reject(err);
          }
          this.name = CAMEL(result.name);
          this.Name = HELPER.strUpFirstLetters(this.name);
          resolve(true);
        });
      });
  }

  readName() {
    STDOUT.write('Please specify the name of the swagger: ');
    STDIN.resume();
    STDIN.setEncoding('utf8');
    STDIN.once('data', (data) => {
      let name = data.replace(/\r?\n|\r/, '');
      this.name = name.replace(/[^a-z0-9\ \_\-]*/ig, '');
      //STDIN.removeListener('data', this.readName);
      STDIN.pause();
    });
  }

  writeTo(path, content) {

    return new Promise((resolve, reject)=> {

      function done(err, result) {
        if(err) {
          return reject(err);
        }
        console.log(`Successfully wrote to `.green, path.green.underline);
        resolve(true);
      }

      function canRead(err) {

        if (err && err.errno === -2) {
          FS.writeFile(path, content, 'utf8', done);
        } else if (err) {
          reject(err);
        } else {
          console.log(`${path} exists and will be overwritten`.red);
          FS.writeFile(path, content, 'utf8', done);
        }
      }//end func

      FS.access(path, FS.F_OK | FS.W_OK, canRead);
    });

  }
};
