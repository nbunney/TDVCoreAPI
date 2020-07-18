class Utility {

  static nextChar(c) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
  }

  static uniqueCode(len = 40) {
    const chars = '0123456789bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ'.split('');
    let outStr = '';

    for (let i = 0; i < len; i++) {
      const r = 0 | Math.random() * chars.length - 1;
      outStr += chars[r];
    }
    return outStr;
  }

}

module.exports = Utility;
