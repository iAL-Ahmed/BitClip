angular.module('bitclip.historyFactory', [])

.factory('History', ['$http', 'Utilities', '$q', function($http, Utilities, $q) {

  //Function queries helloblock with current address 
  //and returns the last 15 transactions from the transaction 
  //history.
  var getTransactionHist = function(currentAddress) {
    var deferred = $q.defer();
    Utilities.isMainNet().then(function(bool) {
      var baseUrl = 'http://' + (bool ? 'mainnet' : 'testnet') + '.helloblock.io/v1/addresses/';
      var requestString = currentAddress;
      baseUrl += requestString;
      baseUrl += '/transactions?limit=15';
      Utilities.httpGet(baseUrl, function(obj) {
        deferred.resolve(obj.data.transactions);
      });
    });
    return deferred.promise;
  };

  //Function tests to see if the current address is part of
  //inbound data or outbound.
  //Used to decide if transactions were inbound or outbound.
  var isContainedinArrayMatrix = function(inputOrOutputMatrix, current) {
    for (var i = 0; i < inputOrOutputMatrix.length; i++ ) {

      var returnedAddress = inputOrOutputMatrix[i][0];
      var returnedValue = inputOrOutputMatrix[i][1];

      var txTime = inputOrOutputMatrix[i][2];
      if (current === returnedAddress) {
        return [returnedAddress, returnedValue, txTime];
      }
    }
    return false;
  };  

//transObj is each object in the transactions array returned by the
//helloBlock, e.g. helloBlockData.data.transactions, where helloBlockData is the 
//JSON object returned by helloblock
var getUsableTransData = function(transObj ,current) {
  var direction, amount, time, address;

  var addressObj = {
    inputs: [],
    outputs: []
  };

  //push address from inputs into addressObj;
  transObj.inputs.forEach(function(tx) {
    addressObj.inputs.push([tx.address, tx.value, transObj.estimatedTxTime]);
  });

  //push address from outputs into addressObj;
  transObj.outputs.forEach(function(tx) {
    addressObj.outputs.push([tx.address, tx.value, transObj.estimatedTxTime]);
  });
  
  //check if currentAddress appears in both outpus and inputs
  if (isContainedinArrayMatrix(addressObj.inputs, current) && isContainedinArrayMatrix(addressObj.outputs, current)) {
    var matchedInputs = isContainedinArrayMatrix(addressObj.inputs, current);
    var matchedOutputs = isContainedinArrayMatrix(addressObj.outputs, current);
    
    var inputAmount = matchedInputs[1];
    var outputAmount = matchedOutputs[1];

    if (outputAmount < inputAmount){
      if(addressObj.outputs[0][0] === current) {
        address = addressObj.outputs[1][0];
      }
      else {
        address = addressObj.outputs[0][0];
      }
      direction = "outbound";
      amount = addressObj.outputs[0][1]; //unspent btc, net total sent.
      time = matchedInputs[2];
    }
  }
  //check if currentAddress only appears in inputs
  //means currentAddress is sending all its btc to another address
  //therefore we need outputs[i].address
  else if (isContainedinArrayMatrix(addressObj.inputs, current) && !isContainedinArrayMatrix(addressObj.outputs, current)) {
    var matchedInputs = isContainedinArrayMatrix(addressObj.inputs, current);
    if(addressObj.outputs[0][0] === current) {
      address = addressObj.outputs[1].address;
    }
    else {
      address = addressObj.outputs[0][0];
    }
    direction = "outbound";
    amount = matchedInputs[1];
    time = matchedInputs[2];
  }
  //check if currentAddress only appears in outputs
  else if (!isContainedinArrayMatrix(addressObj.inputs, current) && isContainedinArrayMatrix(addressObj.outputs, current)) {
    var matchedOutputs = isContainedinArrayMatrix(addressObj.outputs, current);
    address = addressObj.inputs[0][0];
    direction = "inbound";
    amount = matchedOutputs[1];
    time = matchedOutputs[2];
  }

  return [direction, amount/100000000, time*1000, address]
};

return {
  getTransactionHist: getTransactionHist,
  getUsableTransData: getUsableTransData,
};
}])

