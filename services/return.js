class ReturnC {
  static setReturn(data = [], success = true, error = null){

    let stack = (error && error.stack) ? error.stack : new Error().stack;
    if (stack.substr(0,5) === 'Error'){
      stack = stack.substr(10);
      stack = stack.split('(')[2].split(')')[0];
    }

    const out = {
      success: success,
      errorMessage: error && error.message ? error.message : error,
      data: data,
      stack: stack
    };
    return out;
  }

}

module.exports = ReturnC;
