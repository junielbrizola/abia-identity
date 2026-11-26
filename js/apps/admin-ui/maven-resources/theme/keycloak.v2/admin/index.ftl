<!doctype html>
<html lang="en">
  <head>
    <#import "theme-resources.ftl" as themeResourceTags>
    <meta charset="utf-8">
    <#if themeResources?? && themeResources.favicons?has_content>
      <@themeResourceTags.renderFavicons themeResources.favicons resourceUrl />
    <#else>
      <link rel="icon" type="${properties.favIconType!'image/svg+xml'}" href="${resourceUrl}${properties.favIcon!'/favicon.svg'}">
    </#if>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light${darkMode?then(' dark', '')}">
    <meta name="description" content="${properties.description!'The Keycloak Administration Console is a web-based interface for managing Keycloak.'}">
    <title>${properties.title!'Keycloak Administration Console'}</title>
    <style>
      body {
        margin: 0;
      }

      body, #app {
        height: 100%;
      }

      .container {
        padding: 0;
        margin: 0;
        width: 100%;
      }

      .keycloak__loading-container {
        height: 100vh;
        width: 100%;
        color: #151515;
        background-color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        margin: 0;
      }

      :root[data-theme="dark"] .keycloak__loading-container {
        color: #e0e0e0;
        background-color: #1b1d21;
      }

      @media (prefers-color-scheme: dark) {
        .keycloak__loading-container {
          color: #e0e0e0;
          background-color: #1b1d21;
        }
      }

      :root[data-theme="light"] .keycloak__loading-container {
        color: #151515;
        background-color: #fff;
      }

      #loading-text {
        z-index: 1000;
        font-size: 20px;
        font-weight: 600;
        padding-top: 32px;
      }
    </style>
    <script type="importmap">
      {
        "imports": {
          "react": "${resourceCommonUrl}/vendor/react/react.production.min.js",
          "react/jsx-runtime": "${resourceCommonUrl}/vendor/react/react-jsx-runtime.production.min.js",
          "react-dom": "${resourceCommonUrl}/vendor/react-dom/react-dom.production.min.js"
        }
      }
    </script>
    <script>
        (() => {
          const DARK_MODE_CLASS = "${properties.kcDarkModeClass!''}";
          const APPEARANCE_STORAGE_KEY = "abia.appearance.v1";
          const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
          const readPreference = () => {
            try {
              const value = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) || "null");
              const stored = value && typeof value === "object" && !Array.isArray(value) ? value : {};
              return {
                theme: stored.theme === "light" || stored.theme === "dark" || stored.theme === "system" ? stored.theme : "system",
                density: stored.density === "compact" || stored.density === "comfortable" ? stored.density : "comfortable",
                motion: stored.motion === "reduced" || stored.motion === "system" ? stored.motion : "system",
              };
            } catch {
              return { theme: "system", density: "comfortable", motion: "system" };
            }
          };
          let preference = readPreference();

          const applyPreference = () => {
            const isDark = preference.theme === "dark" || (preference.theme === "system" && mediaQuery.matches);
            const theme = isDark ? "dark" : "light";
            const { classList, dataset } = document.documentElement;
            dataset.theme = theme;
            dataset.themePreference = preference.theme;
            dataset.density = preference.density;
            dataset.motion = preference.motion;
            classList.toggle("pf-v5-theme-dark", isDark);
            if (DARK_MODE_CLASS) classList.toggle(DARK_MODE_CLASS, isDark);
            document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme);
          };

          applyPreference();
          mediaQuery.addEventListener("change", () => {
            if (preference.theme === "system") applyPreference();
          });
          window.addEventListener("storage", (event) => {
            if (event.key !== APPEARANCE_STORAGE_KEY && event.key !== null) return;
            preference = readPreference();
            applyPreference();
          });
        })();
    </script>
    <#if !isSecureContext>
      <script type="module" src="${resourceCommonUrl}/vendor/web-crypto-shim/web-crypto-shim.js"></script>
    </#if>
    <#if devServerUrl?has_content>
      <script type="module">
        import { injectIntoGlobalHook } from "${devServerUrl}/@react-refresh";

        injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
      </script>
      <script type="module">
        import { inject } from "${devServerUrl}/@vite-plugin-checker-runtime";

        inject({
          overlayConfig: {},
          base: "/",
        });
      </script>
      <script type="module" src="${devServerUrl}/@vite/client"></script>
      <script type="module" src="${devServerUrl}/src/main.tsx"></script>
    </#if>
    <#if entryStyles?has_content>
      <#list entryStyles as style>
        <link rel="stylesheet" href="${resourceUrl}/${style}">
      </#list>
    </#if>
    <#if themeResources?? && themeResources.styles?has_content>
      <@themeResourceTags.renderStyles themeResources.styles resourceUrl />
    <#elseif properties.styles?has_content>
      <#list properties.styles?split(' ') as style>
        <link rel="stylesheet" href="${resourceUrl}/${style}">
      </#list>
    </#if>
    <#if entryScript?has_content>
      <script type="module" src="${resourceUrl}/${entryScript}"></script>
    </#if>
    <#if themeResources?? && themeResources.scripts?has_content>
      <@themeResourceTags.renderScripts themeResources.scripts resourceUrl "module" />
    <#elseif properties.scripts?has_content>
      <#list properties.scripts?split(' ') as script>
        <script src="${resourceUrl}/${script}" type="module"></script>
      </#list>
    </#if>
    <#if entryImports?has_content>
      <#list entryImports as import>
        <link rel="modulepreload" href="${resourceUrl}/${import}">
      </#list>
    </#if>
  </head>
  <body data-page-id="admin">
    <div id="app">
      <main class="container">
        <div class="keycloak__loading-container">
          <svg class="pf-v5-c-spinner pf-m-xl" role="progressbar" aria-valuetext="Loading..." viewBox="0 0 100 100" aria-label="Contents">
            <circle class="pf-v5-c-spinner__path" cx="50" cy="50" r="45" fill="none"></circle>
          </svg>
          <div>
            <p id="loading-text">Loading the Administration Console</p>
          </div>
        </div>
      </main>
    </div>
    <noscript>JavaScript is required to use the Administration Console.</noscript>
    <script id="environment" type="application/json">
      {
        "serverBaseUrl": "${serverBaseUrl}",
        "adminBaseUrl": "${adminBaseUrl}",
        "authUrl": "${authUrl}",
        "authServerUrl": "${authServerUrl}",
        "realm": "${loginRealm!"master"}",
        "clientId": "${clientId}",
        "resourceUrl": "${resourceUrl}",
        "logo": "${properties.logo!""}",
        "logoUrl": "${properties.logoUrl!""}",
        "darkMode": ${darkMode?c},
        "consoleBaseUrl": "${consoleBaseUrl}",
        "masterRealm": "${masterRealm}",
        "resourceVersion": "${resourceVersion}"
      }
    </script>
  </body>
</html>
