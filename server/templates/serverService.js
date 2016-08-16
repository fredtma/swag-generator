'use strict';

var requestAsync  = Promise.promisify(require('request'), {'multiArgs': true});
var _             = require('lodash');
var commonService = require('../common/commonService');

var empty$Replace$ = {
};

var apiServer = ['was', 'nginx', 'someThose'];

var $internals = {
  'getError': commonService.getError,
  'sculptObject': commonService.sculptObject,

  '$replace$MapCacheCollectionName': '$replace$MapCache',

  'getAuth': function() {
    var api = apiServer[$api$ - 1];
    return commonService[api].auth();
  },

  'basePath': function() {
    var api = apiServer[$api$ - 1];
    return commonService[api].basePath();
  },

  'searchPropertyMap': {
    'getId': _.property('$replace$Id'),
    'getName': _.property('name'),
    'getDateCreated': _.property('datecreated'),
    'getLastEdited': _.property('lastedited'),
    'get$replace$Type': _.property('type')
  },

  'orderByType': {
    'type': function orderByName($replace$) {
      return $internals.searchPropertyMap.get$replace$Type($replace$) || 'a';
    }
  },

  'sculpt$Replace$': function sculpt$Replace$($replace$) {
    $replace$ = $internals.sculptObject($replace$, empty$Replace$);
    return $replace$;
  }
};

exports.config = {
  pathMap: {
    'get$Replace$': '$getPath$',
    'lookup$Replace$': '$lookupPath',
    'save$Replace$': '$postPath$'
  }
};

function commonRequest(url, options, query, method, body) {
  method = method  || 'GET';

  var paramOptions = {
    'method': method,
    'url': url,
    'json': true,
    'auth': $internals.getAuth(),
    'headers': commonService.commonHeaders(options)
  };

  if (query) {
    paramOptions.qs = query;
  }

  if (body) {
    paramOptions.body = body;
  }

  var idnumber        = options.tokenContext.idnumber;
  var brokerHouseCode = options.tokenContext.brokerHouseCode;
  var brokerCode      = options.tokenContext.brokerCode;
  console.info('$Replace$Service %s - call [%s] brokerIdNumber: %s, brokerHouseCode: %s, brokerCode: %s', method, url, idnumber, brokerHouseCode, brokerCode);

  return requestAsync(paramOptions)
    .spread(
      function get$Replace$SuccessHandler(response, body) {
        if (response.statusCode >= 400) {
          throw commonService.responseError('$replace$', response, body);
        }
        return body;
      },
      function get$Replace$FailedHandler(reason) {
        throw $internals.getError(reason);
      }
    );
}

exports.getEmpty$Replace$ = function getEmpty$Replace$() {
  return Promise.resolve($internals.sculpt$Replace$());
};

/**
 * Retrieve a single $replace$
 * method is called from the swagger api controller

 * @example
 * var options = {
 *   'params': request.swagger.params,
 *   'tokenContext': request.swagger.tokenContext
 * };
 * get$Replace$(options);
 * @param {object} options - variable passed from the controller
 * @param {object} options.tokenContext - the content on the token containing [brokerIdNumber, brokerHouseCode, brokerCode]
 * @param {object} options.params - the post content of the $replace$
 * @returns {promise}
 */
exports.get$Replace$ = function get$Replace$(options) {
  var url = $internals.basePath() + exports.config.pathMap.get$Replace$;
  var query = null;
  if (options.params && options.params.$replace$Id) {
    query = {$replace$Id: options.params.$replace$Id.value};
  }

  return commonRequest(url, options, query);//You can transform the return value (promise)
};

/**
 * Retrieve a $replace$/s base upon the lookup
 * method is called from the swagger api controller

 * @example
 * var options = {
 *   'params': request.swagger.params,
 *   'tokenContext': request.swagger.tokenContext
 * };
 * get$Replace$(options);
 * @param {object} options - variable passed from the controller
 * @param {object} options.tokenContext - the content on the token containing [brokerIdNumber, brokerHouseCode, brokerCode]
 * @param {object} options.params - the post content of the $replace$
 * @returns {promise}
 */
exports.get$Replace$Lookup = function get$Replace$Lookup(options) {
  var url = $internals.basePath() + exports.config.pathMap.lookup$Replace$;
  var query = null;
  if (options.params && options.params.proposalId) {
    query = {proposalId: options.params.proposalId.value};
  }
  return commonRequest(url, options, query);//You can transform the return value (promise)
};

/**
 * Will get a collections of $replace$s

 */
exports.get$Replace$List = function get$Replace$(options) {
  var url = $internals.basePath() + exports.config.pathMap.get$Replace$;
  return commonRequest(url, options);//You can transform the return value (promise)
};

/**
 * method is called from the swagger api controller

 * @example
 * var options = {
 *    'tokenContext':{
 *    'brokerIdNumber': tokenContext.idnumber,
 *    'brokerHouseCode': tokenContext.brokerHouseCode,
 *    'brokerCode': tokenContext.brokerCode
 *  },
 *  'body': params.$replace$Detail.value
 * };
 * save$Replace$(options);
 * @param {object} options - variable passed from the controller
 * @param {object} options.tokenContext - the content on the token containing [brokerIdNumber, brokerHouseCode, brokerCode]
 * @param {object} options.body - the post content of the $replace$
 * @returns {promise}
 */
exports.save$Replace$ = function save$Replace$(options) {
  var url = $internals.basePath() + exports.config.pathMap.save$Replace$;
  return commonRequest(url, options, null, 'POST', options.body);
};
