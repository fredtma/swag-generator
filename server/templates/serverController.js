'use strict';
var wealthUtilities = require('wealth-utilities');
var $replace$Service = require('../../lib/services/$replace$/$replace$Service');

function get$Replace$(request, response /*, next*/) {
  return $replace$Service.get$Replace$({
    'params': request.swagger.params,
    'tokenContext': request.swagger.tokenContext
  }).done(
    wealthUtilities.getDefaultSuccessHandler(response),
    wealthUtilities.getDefaultFailedHandler(response)
  );
}

// Update $replace$ detail
function put$Replace$(request, response /*, next*/) {
  var swagger       = request.swagger;
  var params        = swagger.params;
  var tokenContext  = swagger.tokenContext;
  var options       = {
    'tokenContext': {
      'brokerIdNumber': tokenContext.idnumber,
      'brokerHouseCode': tokenContext.brokerHouseCode,
      'brokerCode': tokenContext.brokerCode
    }
  };
  if (params.$replace$Detail) {
    options.body = params.$replace$Detail.value;
  } else {
    options.params = params;
  }

  return $replace$Service.save$Replace$(options).done(
    wealthUtilities.getDefaultSuccessHandler(response),
    wealthUtilities.getDefaultFailedHandler(response)
  );
}

// Add $replace$ detail
function save$Replace$(request, response /*, next*/) {
  var swagger       = request.swagger;
  var params        = swagger.params;
  var tokenContext  = swagger.tokenContext;
  var options       = {
    'tokenContext': {
      'brokerIdNumber': tokenContext.idnumber,
      'brokerHouseCode': tokenContext.brokerHouseCode,
      'brokerCode': tokenContext.brokerCode
    }
  };
  if (params.$replace$Detail) {
    options.body = params.$replace$Detail.value;
  } else {
    options.params = params;
  }
  return $replace$Service.save$Replace$(options).done(
    wealthUtilities.getDefaultSuccessHandler(response),
    wealthUtilities.getDefaultFailedHandler(response)
  );
}

exports.getEmpty  = get$Replace$;
exports.put       = put$Replace$;
exports.get       = get$Replace$;
exports.post      = save$Replace$;
