const async     = require('async');
const fs        = require('fs');
const jformat   = require('json-format');
const mustache  = require('mustache');
const spawn     = require('child_process').spawn;

module.exports = class Helper {

  static copyFile(source, target) {
    return new Promise((resolve, reject) => {

      let reader  = fs.createReadStream(source);
      let writter = fs.createWriteStream(target);

      reader.on('error', reject);
      writter.on('close', resolve);
      reader.pipe(writter);
    });
  }

  static fileDataChanges(data, items, filename, successCallback)  {
    filename = filename || '';

    return new Promise((resolve, reject) => {
      function iterator(ele, callback) {
        if (ele.leave && typeof ele.replace === 'string') {
          ele.replace += `\n\r${ele.search}`;
        }// leave the search in content
        if (ele.searchIfNot) {//if this element is not found then replace
          if (data.search(ele.searchIfNot) === -1) {
            data  = data.replace(ele.search, ele.replace);
          } else {
            console.log('Replacement already exist.');
          }
        } else {
          data  = data.replace(ele.search, ele.replace);
        }//if ele.searchIfNot
        callback(null, ele);
      }

      function done(err, items) {
        if (err) {
          reject(err);
          console.error('Error:', err);
          return;
        }
        resolve(data);
        console.log(`Successful Files search and replace items ${filename}`);
        if (successCallback instanceof Function) {
          return successCallback(data);
        }
      }

      async.map(items, iterator, done);
    });
  }

  /**
   * Iterates each file elements for search and replace
   * @param file: contains iterable file.items elements
   * @param object
   */
  static fileContentChangeWrite(file)  {
    return new Promise((resolve, reject) => {
      let content;

      function success(data) {
        content = data;
        fs.writeFile(file.copyTo || file.path, data, 'utf8', done);
      }//func done
      function done(err, results) {
        if (err) {
          return reject(err);
        }
        resolve(content);
        console.log(`Successfully Replaced & Wrote ${file.copyTo || file.path}`);
      }

      Helper.fileContentGets(file.path).then((data)=> {
        Helper.fileDataChanges(data, file.items, file.path).then(success, reject);
      }, reject);
    });
  }

  static fileContentGets(path, encode)  {
    return new Promise((resolve, reject) => {

      function done(err, data) {
        if (err) {
          console.error(`Error reading file ${path}`, err);
          return reject(err);
        }
        console.log(`Read file ${path}`);
        resolve(data);
      }
      fs.readFile(path, encode || 'utf8', done);
    });
  }

  static jsonToFile(object, path)  {
    let json = jformat(object, {type: 'space', size: 2});
    path  = path || 'varDump.json';
    fs.writeFile(path, json, 'utf8', () => console.log(`Dump file ${path} created`));
  }

  static mustacheFileReplace(copyFrom, copyTo, results) {
    return new Promise((resolve, reject) => {

      Helper.fileContentGets(copyFrom).then((content) => {
        let result = mustache.render(content, results);
        return Helper.writeTo(copyTo, result);
      }).then(resolve).catch(reject);
    });
  }

  static shellExecs(command, arrOption)  {
    console.log(`Running command ${command}: ${arrOption}`);
    return new Promise((resolve, reject) => {

      let shell = spawn(command, arrOption);
      // let shell = spawn('ls', ['-lh']);

      shell.stdout.on('data', (data)=>console.log(`Standard Output: ${data}`));
      shell.stderr.on('data', (data)=>console.info(`Standard Error Output: ${data}`));
      shell.on('exit', done);
      function done(code) {
        if (code === 0) {
          console.log(`Process done with code: ${code}`);
          resolve(code);
        } else {
          console.log(`Process done with ERROR code: ${code}`);
          reject(code);
        }

        // shell.stdin.end();
        if (shell) {
          shell.kill();
        }//'SIGHUP'
        return;
      }
    });
  }

  static strUpFirstLetters(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  static writeTo(path, content, encode) {

    return new Promise((resolve, reject)=> {

      function done(err, result) {
        if (err) {
          return reject(err);
        }
        console.log(`Successfully wrote to `.green, path.green.underline);
        resolve(true);
      }

      function canRead(err) {

        if (err && err.errno === -2) {
          fs.writeFile(path, content, encode || 'utf8', done);
        } else if (err) {
          reject(err);
        } else {
          //console.log(`${path} exists and will be overwritten`.red);
          fs.writeFile(path, content, 'utf8', done);
        }
      }//end func

      fs.access(path, fs.F_OK | fs.W_OK, canRead);
    });

  }
}
