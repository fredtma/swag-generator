module.exports = class Helper{
  static strUpFirstLetters(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
