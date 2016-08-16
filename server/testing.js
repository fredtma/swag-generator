const inquirer = require('inquirer');
const _ = require('lodash');
const INQUIRER  = require('inquirer');

function filterListParam(input) {
  input = input.trim();
  if (!input || input === 'n' || input === 'no') {
    return false;
  } else {
    return input.split(',');
  }
}

function filterMethod(input) {
  let params = {};
  input = input.trim();
  if (!input) {
    return false;
  }
  input.replace(/\{([a-z0-9]+)\}/ig, (a, b) => {
    return b;
  });
  return input;
}

function askWhen(answer) {
  return (key) => {
    return _.get(answer, key) !== false;
  };
}

let methods       = [new INQUIRER.Separator(), {name: 'get', checked: true}, {name: 'list', checked: true}, {name: 'post', checked: true}, {name: 'put', checked: false}, {name: 'lookup', checked: false}];//jscs:disable maximumLineLength
let listDefaults  = ['searchText', 'orderByType', 'orderByName', 'skip', 'take'];
let api           = {type: 'list', name: 'api', message: 'Select the api to connect to', choices: ['was1', 'was2', 'ngnix', 'someThose']};
let method        = {type: 'checkbox', name: 'method', message: 'Select the methods that you will use', choices: methods};
let get           = {type: 'input', name: 'get', message: 'Type the path to the get method, include the paramId e.g: /get/{paramId}', filter: filterMethod, when: askWhen('method.get')};
let post          = {type: 'input', name: 'post', message: 'Type the path to the post method', filter: filterMethod, when: askWhen('method.post')};
let list          = {type: 'input', name: 'list', message: 'Type the path to the get method that will receive a list e.g: /get/', filter: filterMethod, when: askWhen('method.list')};
let lookup        = {type: 'input', name: 'lookup', message: 'Type the path to the path lookup a paramId is optional e.g: /get/lookup/{paramId}?', filter: filterMethod, when: askWhen('method.lookup')};
let listDefault   = {type: 'checkbox', name: 'listDefault', message: 'Select the params you would like to include in the list request', choices: listDefaults, when: askWhen('lookup')};//jscs:disable maximumLineLength
let listParam     = {type: 'input', name: 'listParam', message: 'Is there any additional params you would like to add (add comma separated list or empty for nothing)', filter: filterListParam, when: askWhen('lookup')};
let questions     = [api, method, get, post, list, lookup, listDefault, listParam];

inquirer.prompt(questions).then((answers) => {
  console.log(answers);
});
