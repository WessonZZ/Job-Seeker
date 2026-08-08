/**
 * Electron preload：在页面加载前设置主题，避免白屏/错色闪烁。
 * （Electron 渲染进程中 head 内联脚本可能不执行，这里兜底。）
 */
(function () {
  try {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    window.__themeManual = false;
    window.__preloadRan = true;

    function apply(theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }
    apply(mq.matches ? "dark" : "light");

    // 系统深浅色变化时实时跟随（本会话未手动切换时）
    mq.addEventListener("change", function (e) {
      if (!window.__themeManual) apply(e.matches ? "dark" : "light");
    });
  } catch (e) {
    // 忽略：页面内联脚本与 React 组件会再兜底
  }
})();
