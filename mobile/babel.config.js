module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // react-native-reanimated는 항상 배열의 마지막에 위치해야 합니다.
      "react-native-reanimated/plugin",
    ],
  };
};


