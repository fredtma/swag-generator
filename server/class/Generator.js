'use strict';
require('colors');
const camel     = require('camelcase');
const Helper    = require('./Helper');
const inquirer  = require('inquirer');
const jformat   = require('json-format');
const fs        = require('fs');
const _         = require('lodash');

module.exports = class Generator {

  constructor(name) {
    if (!name) {
      return console.error('No swagger name exists'.red);
    }
    this.name   = camel(name);
    this.Name   = Helper.strUpFirstLetters(name);
    this.config = require('../config.js');

    console.info('Swagger Generator will generate the basic swagger for your application.' +
      '\n\rEnsure that the .\\server\\config.json file has the correct path to your application'.green.bold);

    this.readSwaggerName().then(()=> {
      console.log('ANSWERS', this.answers);
      let definitions = this.createDefinitions();
      let parameters  = this.createParameters();
      let tags        = this.createTags();

      Promise.all([definitions, parameters, tags]).then(value => {
        let pass = true;
        value.forEach(val=> pass = (pass !== true) ? pass : val);

        if (pass === true) {
          return this.createPaths();
        } else {
          console.error('One or more swagger failed to generat'.red, pass);
        }
      }, err => console.error(err))
      .then(this.createController.bind(this))
      .then(this.createService.bind(this));
    }, (err) => console.log(err.red));
  }

  createController() {
    let copyFrom  = `${__dirname}/../templates/serverController.mustache`;
    let copyTo    = `${this.config.dir.controllers}${this.name}Controller.js`;
    return Helper.mustacheFileReplace(copyFrom, copyTo, this.answers);
  }

  createDefinitions() {
    return new Promise((resolve, reject) => {
      let definition  = {};
      let properties  = {};
      let primaryKey  = this.answers.primaryKey || `${this.name}Id`;
      //definition `Body` for the post body, `BodyResponse` for the post response, `ListResponse` for aget list response
      let definitionsKeys = [`${this.Name}Body`,`${this.Name}BodyResponse`,`${this.Name}ListResponse`];
      if (!this.answers.list) {
        definitionsKeys.splice(2, 1);
      }

      definitionsKeys.forEach(definitionKey => {
        properties = {};

        if (definitionKey.indexOf('List') !== -1) {//list properties get an array type of object
          properties = {[`${this.name}`]: {type: 'array', items: {type: 'object'}}};
          definition[definitionKey] = {
            properties
          };
        } else {// definition for body and body response only defines the primary key
          properties = {[primaryKey]: {type: 'string'}};
          definition[definitionKey] = {
            properties,
            required: [primaryKey]
          };
        }
      });

      let content = this.formatJson(definition);

      Helper.writeTo(`${this.config.dir.swagger}definitions/${this.name}.js`, content).then(result => {
        resolve(result);
      });
    });
  }

  createPaths() {
    return new Promise((resolve, reject)=> {
      let path = {};
      //The api point are the key, the object properties are methods, controller, option and alternate
      let pathsKeys = {};

      if (this.answers.get) {
        pathsKeys[this.answers.get] = {method: 'get', controller: `${this.name}Controller`, options: {endPoint: 'get'}};
      }
      if (this.answers.list) {
        pathsKeys[this.answers.list] = {method: 'get', controller: `${this.name}Controller`, options: {endPoint: 'list'}};
      }
      if (this.answers.lookup) {
        pathsKeys[this.answers.lookup] = {method: 'get', controller: `${this.name}Controller`, options: {endPoint: 'lookup'}};
      }
      if (this.answers.post) {
        pathsKeys[this.answers.post] = {method: 'post', controller: `${this.name}Controller`, options: {endPoint: 'post'}};
      }
      if (this.answers.put) {
        pathsKeys[this.answers.put] = {method: 'put', controller: `${this.name}Controller`, options: {endPoint: 'put'}};
      }

      for (let key in pathsKeys) {
        if (pathsKeys.hasOwnProperty(key)) {
          let node          = pathsKeys[key];
          let method        = node.method;
          path[key]         = {'x-swagger-router-controller': node.controller};
          path[key][method] = this.methodCall(method, node.options.endPoint, node.options);
        }
      }
      let content = this.formatJson(path);

      Helper.writeTo(`${this.config.dir.swagger}paths/${this.name}.js`, content).then(result=> {
        resolve(result);
      });
    });
  }

  createParameters() {
    return new Promise((resolve, reject) => {
      let parameter       = {};
      let parametersKeys  = [`${this.name}Path`,`${this.name}Query`];
      if (!this.answers.get && !this.answers.put) {
        parametersKeys.splice(0, 1);
      }

      parametersKeys.forEach(parameterKey => {
        let inOpt   = parameterKey.replace(this.name, '').toLowerCase();//path || query
        let paramId = this.answers.primaryKey;
        if (!paramId) {
          return;
        }

        parameter[parameterKey] = {
          name: paramId,
          in: inOpt,
          description: `The ${paramId} to get/add/update`,
          required: (inOpt === 'path') ? true : false,
          type: 'string'
        };
      });
      let content = this.formatJson(parameter);

      Helper.writeTo(`${this.config.dir.swagger}parameters/${this.name}.js`, content).then(result=> {
        resolve(result);
      });
    });
  }

  createService() {
    var serviceDir = `${this.config.dir.services}${this.name}/`;

    function error(err) {
      console.error('The following error occured:', err);
    }

    return new Promise((resolve, reject) => {//check if directory exists or creates it
      if (!this.config.options.createServiceDirectory) {
        serviceDir = `${this.config.dir.services}`;
        return resolve(true);
      }

      fs.access(serviceDir, fs.F_OK | fs.W_OK, (err) => {

        if (err && err.errno === -2) {
          fs.mkdir(serviceDir, resolve);
        } else if (err) {
          reject(err);
        } else {
          console.log(`Directory exists ${serviceDir}`);
          resolve(true);
        }
      });

    }).then(() => {
      let copyFrom  = `${__dirname}/../templates/serverService.mustache`;
      let copyTo    = `${serviceDir}${this.name}Service.js`;
      return Helper.mustacheFileReplace(copyFrom, copyTo, this.answers);
    }, error);

  }

  createSerciveLocal(name) {
    name        = Helper.strUpFirstLetters(name);
    let source  = `${__dirname}/../templates/server${name}Service.js`;
    let dest    = `${this.config.dir.services}${this.name}/${this.name}${name}Service.js`;
    Helper.copyFile(source, dest);
  }

  createTags() {
    return new Promise((resolve, reject) => {
      let tag = {
        name: this.name,
        description: `CRUD operations for ${this.Name}`
      };
      let content = this.formatJson(tag);

      Helper.writeTo(`${this.config.dir.swagger}tags/${this.name}.js`, content).then(result=> {
        resolve(result);
      });
    });
  }

  formatJson(json) {
    let jsonFormat = jformat(json, {type: 'space', size: 2});
    return `'use strict';
module.exports = ${jsonFormat};
`.replace(/"/ig, `'`);
  }

  methodCall(method, endPoint, options) {

    function description() {
      switch (endPoint){
        case 'get': return `Get details of a ${this.name}`;
        case 'list': return `Get the list of ${this.name}s`;
        case 'post': return `save record for ${this.name}`;
        case 'put': return `update the specific ${this.name}`;
        case 'delete': return 'Delete record';
        case 'lookup': return 'Lookup a record';
      }
    }

    function parameters() {
      let params = [
        {
          '$ref': `#/parameters/${this.name}Query`
        }
      ];

      if (this.answers.token) {
        params.push({'$ref': '#/parameters/TokenHeader'});
      }

      let paramsWithList = [];//the query parameters
      let order = {
        'name': 'order',
        'in': 'query',
        'description': 'Order the notes list ascending or descending',
        'required': false,
        'type': 'string',
        'enum': ['asc', 'desc'],
        'default': 'asc'
      };
      if (Array.isArray(this.answers.listDefault)) {
        if (this.answers.listDefault.indexOf('searchText') !== -1) {
          paramsWithList.push({
            'name': 'searchText',
            'in': 'query',
            'description': 'Only include notes that match the search text',
            'required': false,
            'type': 'string'
          });
        }
        if (this.answers.listDefault.indexOf('orderByType') !== -1) {
          paramsWithList.push(order);
          paramsWithList.push({
            'name': 'orderByType',
            'in': 'query',
            'description': 'Order the note list by this property',
            'required': false,
            'type': 'string',
            'enum': ['name', 'note'],
            'default': 'name'
          });
        }
        if (this.answers.listDefault.indexOf('orderByName') !== -1) {
          paramsWithList.push(order);
          paramsWithList.push({
            'name': 'orderByName',
            'in': 'query',
            'description': 'Order the note list by this property',
            'required': false,
            'type': 'string',
            'enum': ['name', 'note'],
            'default': 'name'
          });
        }
        if (this.answers.listDefault.indexOf('skip') !== -1) {
          paramsWithList.push({
            'name': 'skip',
            'in': 'query',
            'description': 'Skip this many notes in the list, used for progressive loading or pagination',
            'required': false,
            'type': 'integer',
            'minimum': 0,
            'default': 0
          });
        }
        if (this.answers.listDefault.indexOf('take') !== -1) {
          paramsWithList.push({
            'name': 'take',
            'in': 'query',
            'description': 'Only return this many note',
            'required': false,
            'type': 'integer',
            'minimum': 10,
            'default': 10
          });
        }
      }

      let body = {
        'name': `${this.name}Detail`,
        'in': 'body',
        'description': `A ${this.name} detail to add`,
        'required': true,
        'schema': {
          '$ref': `#/definitions/${this.Name}Body`
        }
      };

      switch (endPoint){
        case 'lookup':
        case 'list':
          //add additional query params
          if (this.answers.query && Array.isArray(this.answers.query.list)) {
            this.answers.query.list.forEach((item) => {
              item = item.trim();
              params.push({
                'name': item,
                'in': 'query',
                'description': 'path parameter included in the url: ' + item,
                'required': false,
                'type': 'string'
              });
            });
          }
          //add additional params
          if (this.answers.params && Array.isArray(this.answers.params.list)) {
            this.answers.params.list.forEach((item) => {
              if (this.answers.primaryKey === item) {
                return;
              }
              item = item.trim();
              params.push({
                'name': item,
                'in': 'path',
                'description': 'path parameter included in the url: ' + item,
                'required': true,
                'type': 'string'
              });
            });
          }
          params = params.concat(paramsWithList);
          break;
        case 'post':
          params[1] = body;
          break;
        case 'put':
        case 'get':

          if (this.answers.params && Array.isArray(this.answers.params.get)) {
            this.answers.params.get.forEach((item) => {
              if (this.answers.primaryKey === item) {
                return;
              }
              item = item.trim();
              params.push({
                'name': item,
                'in': 'path',
                'description': 'path parameter included in the url: ' + item,
                'required': true,
                'type': 'string'
              });
            });
          }

          if (this.answers.primaryKey) {//if the the param Id is in the path
            params[1] = {'$ref': `#/parameters/${this.name}Path`};
          }
      }
      return params;
    }

    function responses() {
      let primaryKey = this.answers.primaryKey || `${this.name}Id`;
      let response = {
        '200': {
          'description': 'Success',
          'schema': {
            '$ref': `#/definitions/${this.Name}BodyResponse`
          },
          'examples': {
            'application/json': {
              [`${this.name}`]: {
                [primaryKey]: '1', 'created_at': '2016-07-04', 'updated_at': '2016-07-11'
              }
            }
          }
        }
      };//responses

      switch (endPoint) {
        case 'get': break;
        case 'list':
          let example = [{[primaryKey]: '1', 'created_at': '2016-07-04', 'updated_at': '2016-07-11'}];
          let ref     = '$ref';
          response[200].schema[ref] = `#/definitions/${this.Name}ListResponse`;
          response[200].examples['application/json'][`${this.name}`]    = example;
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
      tags.push((method === 'post') ? 'add' : (method === 'gets') ? 'get' : method);
      return tags;
    }

    let methodsTags = {
      tags: tags.call(this),
      description: description.call(this),
      parameters: parameters.call(this),
      responses: responses.call(this)
    };

    if (endPoint === 'list') {
      methodsTags.operationId = `get${this.Name}List`;
    }

    return methodsTags;
  }

  readSwaggerName() {
    let params  = {};
    let query   = {};
    let primaryKey;

    function askWhen(key, value) {
      return (answer) => {
        return (Array.isArray(answer[key])) ? answer[key].indexOf(value) !== -1 : !!_.get(answer, key);
      };
    }

    function checkPK(answer) {
      return !answer.confirmPK;//if false send true
    }

    function filterListQuery(key) {

      query[key] = [];
      return (input) => {
        input = (typeof input === 'string') ? input.trim() : input;
        if (!input || input === 'n' || input === 'no') {
          return false;
        } else {
          let value   = input.split(',');
          query[key]  = value;
          return value;
        }
      };
    }

    function filterMethod(input) {
      input = (typeof input === 'string') ? input.trim() : input;
      if (!input) {
        return false;
      }
      return input;
    }

    function filterMethodParam(key) {

      params[key] = [];
      return (input) => {
        input = input.trim();
        if (!input) {
          return false;
        }
        input.replace(/\{([a-z0-9]+)\}/ig, (a, b) => {
          params[key].push(b);

          if (key.search(/id/ig)) {
            primaryKey = primaryKey || b;// the pk is set from the first parameter
          }
          return b;
        });
        return input;
      };
    }

    function validationRequired(input) {
      input = (typeof input === 'string') ? input.trim() : input;
      return !input.length ? 'This is a required field' : true;
    }

    let methods       = [new inquirer.Separator(), {name: 'get', checked: true}, {name: 'list', checked: true}, {name: 'post', checked: true}, {name: 'put', checked: false}, {name: 'lookup', checked: false}];//jscs:disable maximumLineLength
    let listDefaults  = ['searchText', 'orderByType', 'orderByName', '_skip', '_take'];
    let apis          = ['was', 'was2', 'ngnix', 'someThose', 'gemStoneLocal', 'mongoLocal', 'empty'];

    let api           = {type: 'list', name: 'api', message: 'Select the API to connect to:', choices: apis, default: 'was'};
    let method        = {type: 'checkbox', name: 'method', message: 'Select the METHODS that you will use:', choices: methods, validate: validationRequired};
    let get           = {type: 'input', name: 'get', message: 'Type the path to the GET method, include the paramId e.g: /get/{paramId}:', filter: filterMethodParam('get'), when: askWhen('method', 'get')};
    let confirmPK     = {type: 'confirm', name: 'confirmPK', message: `The PRIMARY KEY was included in the path, is this correct?`, when: () => !!primaryKey};
    let pk            = {type: 'input', name: 'pk', message: `What is the PRIMARY KEY?`, when: checkPK, validate: validationRequired};
    let post          = {type: 'input', name: 'post', message: 'Type the path to the POST method:', filter: filterMethod, when: askWhen('method', 'post')};
    let put           = {type: 'input', name: 'put', message: 'Type the path to the PUT method:', filter: filterMethod, when: askWhen('method', 'put')};
    let list          = {type: 'input', name: 'list', message: 'Type the path to the get method that will receive a LIST e.g: /get/', filter: filterMethodParam('list'), when: askWhen('method', 'list')};
    let listDefault   = {type: 'checkbox', name: 'listDefault', message: 'Select the QUERY variables you would like to include in the list request:', choices: listDefaults, when: askWhen('list')};//jscs:disable maximumLineLength
    let listQuery     = {type: 'input', name: 'listQuery', message: 'Is there any additional QUERY variable you would like to add (add comma separated list or empty for nothing)?', filter: filterListQuery('list'), when: askWhen('list')};
    let lookup        = {type: 'input', name: 'lookup', message: 'Type the path to the path lookup a paramId is optional e.g: /get/lookup/{paramId}?', filter:  filterMethodParam('lookup'), when: askWhen('method', 'lookup')};
    let mongodb       = {type: 'input', name: 'mongodb', message: 'You have selected a MONGODB, type the name of the collection to use:', when: askWhen('api', 'mongoLocal'), validate: validationRequired};
    let mongodb       = {type: 'confirm', name: 'token', message: 'Will the application make use of TOKEN?'};
    let questions     = [api, method, get, confirmPK, pk, post, put, list, listDefault, listQuery, lookup, mongodb, token];

    return new Promise((resolve, reject) => {
      if (!this.name) {
        return reject('No swagger name exists');
      }

      inquirer.prompt(questions).then((answers) => {
        this.answers            = answers;
        this.answers.replace    = this.name;
        this.answers.Replace    = this.Name;
        this.answers.params     = params;
        this.answers.query      = query;
        this.answers.primaryKey = answers.pk || primaryKey;
        apis.forEach(item =>  this.answers[item] = this.answers.api === item);

        switch (this.answers.api) {
          case 'mongoLocal':
            this.answers.request = false;
            break;
          case 'empty':
          case 'gemStoneLocal':
            this.answers.request = false;
            this.createSerciveLocal(this.answers.api);
            break;
          default:
            this.answers.request = true; break;
        }

        resolve(this.answers);
      });

    });
  }

  readName() {
    const STDIN     = process.stdin;
    const STDOUT    = process.stdout;

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

};
