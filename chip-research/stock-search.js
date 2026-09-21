(() => {
  "use strict";
  const root = document.getElementById("stock-search");
  if (!root) return;
  const input = document.getElementById("stock-query");
  const results = document.getElementById("stock-search-results");
  const status = document.getElementById("stock-search-status");
  const clear = document.getElementById("stock-search-clear");
  const retry = document.getElementById("stock-search-retry");
  const limit = 20;
  const normalize = (text) => String(text).normalize("NFKC").toUpperCase().replace(/臺/g, "台").replace(/\s+/g, "");
  let indexPromise;
  let revision = 0;
  let composing = false;

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(root.dataset.indexUrl, {signal: controller.signal});
          if (!response.ok) throw new Error("Index unavailable");
          const data = await response.json();
          if (data.schema_version !== 1 || !Array.isArray(data.stocks)) throw new Error("Invalid index");
          data.stocks = data.stocks.map((stock) => ({
            ...stock,
            keys: [stock.name, ...(stock.aliases || [])].map((name) => normalize(stock.code + name)),
          }));
          return data;
        } finally {
          clearTimeout(timer);
        }
      })().catch((error) => { indexPromise = undefined; throw error; });
    }
    return indexPromise;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function resultItem(stock, latestDate) {
    const item = element("li");
    const link = element("a", "search-result");
    link.href = `stock/${encodeURIComponent(stock.code)}/`;
    const identity = element("div");
    const title = element("span", "search-result-title", `${stock.code} ${stock.name}`);
    if (stock.market) title.append(element("small", "", stock.market));
    const current = stock.last_seen === latestDate;
    identity.append(title, element("span", `search-result-state${current ? " is-current" : ""}`, current ? "本期上榜" : "歷史上榜 · 本期未上榜"));
    const history = element("div", "search-result-history");
    history.append(
      element("span", "", `最近上榜 ${stock.last_seen} · 累計 ${stock.appearances} 次`),
      element("span", "", `最後組別：${stock.group_title}`),
    );
    link.append(identity, history, element("span", "search-result-action", "查看歷史 →"));
    item.append(link);
    return item;
  }

  function matchPriority(stock, query) {
    const code = normalize(stock.code);
    if (code === query) return 0;
    if (code.startsWith(query)) return 1;
    if ([stock.name, ...(stock.aliases || [])].some((name) => normalize(name) === query)) return 2;
    return 3;
  }

  async function search(updateUrl = true) {
    const request = ++revision;
    const raw = input.value.trim();
    const query = normalize(raw);
    clear.hidden = !input.value;
    retry.hidden = true;
    results.replaceChildren();
    results.hidden = true;
    if (updateUrl) {
      const url = new URL(location.href);
      if (raw) url.searchParams.set("q", raw);
      else url.searchParams.delete("q");
      history.replaceState(null, "", url);
    }
    status.textContent = "";
    if (!query) return;
    status.textContent = "正在載入歷史搜尋清單…";
    try {
      const data = await loadIndex();
      if (request !== revision) return;
      const matches = data.stocks.filter((stock) => stock.keys.some((key) => key.includes(query)));
      matches.sort((a, b) => matchPriority(a, query) - matchPriority(b, query)
        || b.last_seen.localeCompare(a.last_seen) || a.code.localeCompare(b.code));
      if (!matches.length) {
        status.textContent = "找不到曾上榜紀錄。可試試完整代號或部分名稱；未收錄的股票不會顯示，也不會自動啟動資料抓取。";
        return;
      }
      const fragment = document.createDocumentFragment();
      for (const stock of matches.slice(0, limit)) fragment.append(resultItem(stock, data.latest_date));
      results.append(fragment);
      results.hidden = false;
      status.textContent = `找到 ${matches.length} 檔${matches.length > limit ? `，先顯示前 ${limit} 檔，請增加關鍵字縮小範圍。` : "。點選股票查看歷史與法人曲線。"}`;
    } catch (_) {
      if (request !== revision) return;
      status.textContent = "搜尋清單暫時無法載入，請檢查網路後重試。下方排行榜仍可使用。";
      retry.hidden = false;
    }
  }

  input.addEventListener("focus", () => { loadIndex().catch(() => {}); });
  input.addEventListener("compositionstart", () => { composing = true; ++revision; results.hidden = true; });
  input.addEventListener("compositionend", () => { composing = false; search(); });
  input.addEventListener("input", () => { if (!composing) search(); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !event.isComposing) {
      event.preventDefault(); input.value = ""; search();
    }
  });
  clear.addEventListener("click", () => { input.value = ""; search(); input.focus(); });
  retry.addEventListener("click", () => search());
  document.getElementById("stock-search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!composing && !results.hidden) results.querySelector("a")?.click();
  });
  window.addEventListener("popstate", () => {
    input.value = (new URL(location.href).searchParams.get("q") || "").slice(0, 80);
    search(false);
  });
  input.value = (new URL(location.href).searchParams.get("q") || "").slice(0, 80);
  if (input.value) search(false);
})();
