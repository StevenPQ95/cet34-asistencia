/* ============================================================
   CET 34 · auth.js
   AUTENTICACIÓN COMÚN PARA TODAS LAS PÁGINAS PRIVADAS
   ============================================================

   Uso:

   <script src="https://accounts.google.com/gsi/client"
           async defer></script>

   <script src="auth.js"></script>

   <script>
     CET34Auth.requireAuth({
       roles: ["ADMINISTRADOR", "DOCENTE"]
     }).then(function(usuario) {
       console.log("Usuario autorizado:", usuario);
       // Inicializar aquí la página privada.
     }).catch(function(error) {
       console.error(error);
     });
   </script>

   Para consultar el servidor después del login:

     const datos = await CET34Auth.request(
       "estadisticas",
       {}
     );

   Seguridad:
   - El ID Token vive solo en memoria de la página.
   - NO se guarda en localStorage ni sessionStorage.
   - Cada petición privada vuelve a enviar el token al servidor.
   - Apps Script valida nuevamente el token y el rol.
   ============================================================ */

(function (window) {

  "use strict";


  /* ==========================================================
     CONFIGURACIÓN
     ========================================================== */

  const CONFIG = Object.freeze({

    APP_URL:
      "https://script.google.com/macros/s/AKfycbwKwnUGpCtVSqCPMkFgaq3ho3e1Z12-xVjzKwl_bwfzOwV7SYHmB9tuSBuOnGJglb7x/exec",

    GOOGLE_CLIENT_ID:
      "1014449940080-f87gjj53j23f9or14hn4ddmaop2vl2ks.apps.googleusercontent.com",

    TIMEOUT:
      30000

  });


  /* ==========================================================
     ESTADO PRIVADO DE ESTA PÁGINA
     ========================================================== */

  let idToken = null;
  let usuario = null;
  let googleInicializado = false;
  let loginEnCurso = null;
  let contador = 0;

  /*
     OPTIMIZACIÓN 3 · PUENTE PERSISTENTE
     -----------------------------------
     Antes: cada petición creaba un iframe + formulario POST nuevo.
     Ahora: se mantiene un único iframe del puente Apps Script
     y las peticiones se envían mediante postMessage().

     Se conserva un transporte POST de respaldo para que, si el
     puente persistente no carga en algún navegador, el sistema
     siga funcionando de la forma anterior.
  */
  let puenteIframe = null;
  let puenteListo = false;
  let puenteInicializacion = false;

  const pendientes = new Map();


  /* ==========================================================
     UTILIDADES
     ========================================================== */

  function crearId() {

    contador += 1;

    let aleatorio = "";

    try {

      if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
      ) {
        aleatorio =
          window.crypto.randomUUID();
      }

    } catch (_) {}

    if (!aleatorio) {

      aleatorio =
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);

    }

    return (
      "cet34_" +
      aleatorio +
      "_" +
      contador
    );

  }


  function origenAppsScriptValido(origen) {

    const texto =
      String(origen || "");

    return (
      texto === "https://script.google.com" ||
      /^https:\/\/([a-z0-9-]+\.)*googleusercontent\.com$/i.test(texto)
    );

  }


  function limpiar(form, iframe) {

    try {
      form.remove();
    } catch (_) {}

    try {
      iframe.remove();
    } catch (_) {}

  }


  /* ==========================================================
     PANEL DE ACCESO COMÚN
     ========================================================== */

  function asegurarPanel() {

    let panel =
      document.getElementById(
        "pantallaAcceso"
      );

    if (panel) {
      return panel;
    }

    panel =
      document.createElement("div");

    panel.id =
      "pantallaAcceso";

    panel.style.cssText = `
      position:fixed;
      inset:0;
      z-index:999999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      background:rgba(15,23,42,.96);
      backdrop-filter:blur(8px);
      font-family:Arial,Helvetica,sans-serif;
    `;

    panel.innerHTML = `
      <div
        style="
          width:min(420px,100%);
          box-sizing:border-box;
          padding:28px 22px;
          border-radius:24px;
          background:#fff;
          text-align:center;
          box-shadow:0 20px 60px rgba(0,0,0,.25);
        "
      >
        <div style="font-size:42px;margin-bottom:10px;">🔐</div>

        <div
          style="
            font-size:22px;
            font-weight:800;
            color:#0f172a;
          "
        >
          Acceso al sistema
        </div>

        <div
          id="accesoMensaje"
          style="
            margin-top:10px;
            color:#64748b;
            font-size:14px;
            line-height:1.5;
          "
        >
          Verificando tu cuenta de Google...
        </div>

        <div
          id="accesoUsuario"
          style="
            margin-top:10px;
            color:#334155;
            font-size:13px;
            font-weight:700;
            word-break:break-word;
          "
        ></div>

        <div
          id="accesoAcciones"
          style="
            display:none;
            gap:9px;
            margin-top:18px;
          "
        >
          <button
            id="cet34CambiarCuenta"
            type="button"
            style="
              width:100%;
              border:0;
              border-radius:14px;
              padding:12px 16px;
              font-size:14px;
              font-weight:800;
              cursor:pointer;
              background:#0f172a;
              color:#fff;
            "
          >
            🔄 Cambiar cuenta de Google
          </button>

          <button
            id="cet34Reintentar"
            type="button"
            style="
              width:100%;
              border:0;
              border-radius:14px;
              padding:12px 16px;
              font-size:14px;
              font-weight:800;
              cursor:pointer;
              background:#e2e8f0;
              color:#334155;
            "
          >
            ↻ Reintentar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    document
      .getElementById("cet34CambiarCuenta")
      .addEventListener(
        "click",
        function () {
          login(true);
        }
      );

    document
      .getElementById("cet34Reintentar")
      .addEventListener(
        "click",
        function () {
          login(false);
        }
      );

    return panel;

  }


  function mostrarAcceso(
    mensaje,
    acciones
  ) {

    const panel =
      asegurarPanel();

    const mensajeEl =
      document.getElementById(
        "accesoMensaje"
      );

    const accionesEl =
      document.getElementById(
        "accesoAcciones"
      );

    if (mensajeEl) {

      mensajeEl.textContent =
        mensaje ||
        "Verificando tu cuenta de Google...";

    }

    if (accionesEl) {

      accionesEl.style.display =
        acciones
          ? "grid"
          : "none";

    }

    panel.style.display =
      "flex";

  }


  function ocultarAcceso() {

    const panel =
      document.getElementById(
        "pantallaAcceso"
      );

    if (panel) {
      panel.style.display =
        "none";
    }

  }


  function mostrarUsuarioEnPanel(datos) {

    const el =
      document.getElementById(
        "accesoUsuario"
      );

    if (!el) {
      return;
    }

    el.textContent =
      (
        datos.nombre ||
        datos.correo ||
        ""
      ) +
      (
        datos.rol
          ? " · " + datos.rol
          : ""
      );

  }


  /* ==========================================================
     ESPERAR GOOGLE IDENTITY SERVICES
     ========================================================== */

  function esperarGoogle() {

    return new Promise(
      function (resolve, reject) {

        const limite =
          Date.now() + 15000;

        function revisar() {

          if (
            window.google &&
            google.accounts &&
            google.accounts.id
          ) {

            resolve();
            return;

          }

          if (
            Date.now() >= limite
          ) {

            reject(
              new Error(
                "Google Identity Services no está disponible."
              )
            );

            return;

          }

          setTimeout(
            revisar,
            200
          );

        }

        revisar();

      }
    );

  }


  /* ==========================================================
     AUTENTICACIÓN
     ========================================================== */

  function login(
    forzarSeleccion
  ) {

    if (loginEnCurso) {
      return loginEnCurso;
    }

    mostrarAcceso(
      "Cargando Google Identity Services...",
      false
    );

    loginEnCurso =
      esperarGoogle()

        .then(
          function () {

            if (
              forzarSeleccion
            ) {

              try {
                google.accounts.id.disableAutoSelect();
              } catch (_) {}

            }

            if (
              !googleInicializado
            ) {

              google.accounts.id.initialize({

                client_id:
                  CONFIG.GOOGLE_CLIENT_ID,

                callback:
                  recibirCredencial,

                auto_select:
                  false,

                cancel_on_tap_outside:
                  false

              });

              googleInicializado =
                true;

            }

            mostrarAcceso(
              "Selecciona la cuenta de Google autorizada para utilizar el sistema.",
              false
            );

            google.accounts.id.prompt();

          }
        )

        .finally(
          function () {
            loginEnCurso =
              null;
          }
        );

    return loginEnCurso;

  }


  function recibirCredencial(
    respuesta
  ) {

    if (
      !respuesta ||
      !respuesta.credential
    ) {

      idToken =
        null;

      usuario =
        null;

      mostrarAcceso(
        "Google no devolvió una credencial válida.",
        true
      );

      return;

    }

    verificarToken(
      respuesta.credential
    );

  }


  async function verificarToken(
    tokenRecibido
  ) {

    idToken =
      tokenRecibido;

    mostrarAcceso(
      "Verificando tu cuenta con el sistema CET 34...",
      false
    );

    try {

      const datos =
        await enviarPOST(
          "verificargoogletoken",
          {
            token:
              idToken
          }
        );

      if (
        datos &&
        datos.exito === true &&
        datos.autorizado === true
      ) {

        usuario =
          Object.freeze({
            correo:
              datos.correo || "",

            nombre:
              datos.nombre || "",

            rol:
              datos.rol || "",

            estado:
              datos.estado || "ACTIVO"
          });

        mostrarUsuarioEnPanel(
          datos
        );

        ocultarAcceso();

        return usuario;

      }

      idToken =
        null;

      usuario =
        null;

      mostrarUsuarioEnPanel(
        datos || {}
      );

      mostrarAcceso(
        (
          datos &&
          datos.mensaje
        ) ||
        "Tu cuenta no está autorizada para utilizar el sistema.",
        true
      );

      throw new Error(
        (
          datos &&
          datos.mensaje
        ) ||
        "CUENTA_NO_AUTORIZADA"
      );

    } catch (error) {

      idToken =
        null;

      usuario =
        null;

      console.error(
        "CET34 AUTH:",
        error
      );

      if (
        error &&
        error.message !== "CUENTA_NO_AUTORIZADA"
      ) {

        mostrarAcceso(
          "No se pudo verificar tu cuenta con el servidor. Inténtalo nuevamente.",
          true
        );

      }

      throw error;

    }

  }


  /* ==========================================================
     TRANSPORTE POST + IFRAME
     ========================================================== */

  /* ==========================================================
     OPTIMIZACIÓN 3 · PUENTE PERSISTENTE
     ========================================================== */

  function iniciarPuentePersistente_() {

    if (
      puenteIframe &&
      puenteListo
    ) {
      return;
    }

    if (puenteInicializacion) {
      return;
    }

    /*
       auth.js se carga en el <head>. Si todavía no existe <body>,
       esperamos a que el DOM esté disponible antes de crear el iframe.
    */
    if (!document.body) {
      document.addEventListener(
        "DOMContentLoaded",
        function() {
          iniciarPuentePersistente_();
        },
        { once: true }
      );
      return;
    }

    puenteInicializacion = true;

    try {

      const iframe =
        document.createElement(
          "iframe"
        );

      iframe.title =
        "Puente seguro CET 34";

      iframe.setAttribute(
        "aria-hidden",
        "true"
      );

      iframe.style.cssText = `
        position:fixed;
        width:1px;
        height:1px;
        left:-9999px;
        top:-9999px;
        border:0;
        opacity:0;
        pointer-events:none;
      `;

      /*
         El parámetro _cet34puente evita que un navegador o
         intermediario reutilice una respuesta antigua.
      */
      iframe.src =
        CONFIG.APP_URL +
        "?action=puente&_cet34puente=3";

      document.body.appendChild(
        iframe
      );

      puenteIframe =
        iframe;

      console.info(
        "CET34 OPT3: iniciando puente persistente..."
      );

      /*
         Si después de unos segundos no está listo, no bloqueamos
         la aplicación: las peticiones utilizarán el transporte
         POST tradicional hasta que el puente quede disponible.
      */
      setTimeout(
        function() {

          if (
            !puenteListo
          ) {

            puenteInicializacion =
              false;

            console.warn(
              "CET34 OPT3: puente persistente aún no está listo; se mantiene respaldo POST."
            );

          }

        },
        4000
      );

    } catch (error) {

      puenteInicializacion =
        false;

      console.warn(
        "CET34 OPT3: no se pudo iniciar el puente persistente.",
        error
      );

    }

  }


  function enviarPOSTLegacy_(
    action,
    parametros
  ) {

    return new Promise(
      function (resolve, reject) {

        const id =
          crearId();

        const nombreIframe =
          "cet34_auth_" +
          id.replace(
            /[^a-zA-Z0-9_]/g,
            ""
          );

        const iframe =
          document.createElement(
            "iframe"
          );

        iframe.name =
          nombreIframe;

        iframe.title =
          "Comunicación segura CET 34";

        iframe.setAttribute(
          "aria-hidden",
          "true"
        );

        iframe.style.cssText = `
          position:fixed;
          width:1px;
          height:1px;
          left:-9999px;
          top:-9999px;
          border:0;
          opacity:0;
          pointer-events:none;
        `;

        document.body.appendChild(
          iframe
        );

        const form =
          document.createElement(
            "form"
          );

        form.method =
          "POST";

        form.action =
          CONFIG.APP_URL;

        form.target =
          nombreIframe;

        form.acceptCharset =
          "UTF-8";

        form.style.display =
          "none";

        const agregar =
          function (nombre, valor) {

            const input =
              document.createElement(
                "input"
              );

            input.type =
              "hidden";

            input.name =
              nombre;

            input.value =
              String(
                valor ?? ""
              );

            form.appendChild(
              input
            );

          };

        agregar(
          "action",
          action
        );

        agregar(
          "requestId",
          id
        );

        agregar(
          "payload",
          JSON.stringify(
            parametros || {}
          )
        );

        document.body.appendChild(
          form
        );

        const temporizador =
          setTimeout(
            function () {

              pendientes.delete(
                id
              );

              limpiar(
                form,
                iframe
              );

              reject(
                new Error(
                  "El servidor tardó demasiado en responder."
                )
              );

            },
            CONFIG.TIMEOUT
          );

        pendientes.set(
          id,
          {
            resolve:
              resolve,

            reject:
              reject,

            temporizador:
              temporizador,

            form:
              form,

            iframe:
              iframe,

            transporte:
              "legacy"
          }
        );

        try {

          form.submit();

        } catch (error) {

          clearTimeout(
            temporizador
          );

          pendientes.delete(
            id
          );

          limpiar(
            form,
            iframe
          );

          reject(
            error
          );

        }

      }
    );

  }


  function enviarPOST(
    action,
    parametros
  ) {

    /*
       Si el puente ya está listo, no creamos ningún iframe nuevo.
       Esta es la optimización principal.
    */
    if (
      puenteListo &&
      puenteIframe &&
      puenteIframe.contentWindow
    ) {

      return new Promise(
        function (resolve, reject) {

          const id =
            crearId();

          const temporizador =
            setTimeout(
              function () {

                pendientes.delete(
                  id
                );

                reject(
                  new Error(
                    "El servidor tardó demasiado en responder."
                  )
                );

              },
              CONFIG.TIMEOUT
            );

          pendientes.set(
            id,
            {
              resolve:
                resolve,

              reject:
                reject,

              temporizador:
                temporizador,

              form:
                null,

              iframe:
                null,

              transporte:
                "puente"
            }
          );

          try {

            puenteIframe.contentWindow.postMessage(
              {
                canal:
                  "CET34",

                tipo:
                  "llamada",

                id:
                  id,

                action:
                  String(
                    action || ""
                  ),

                parametros:
                  parametros || {}
              },
              "*"
            );

          } catch (error) {

            clearTimeout(
              temporizador
            );

            pendientes.delete(
              id
            );

            reject(
              error
            );

          }

        }
      );

    }

    /*
       Respaldo: si el puente persistente todavía no está listo,
       usamos exactamente el mecanismo anterior.
    */
    return enviarPOSTLegacy_(
      action,
      parametros
    );

  }

  window.addEventListener(
    "message",
    function (event) {

      if (
        !origenAppsScriptValido(
          event.origin
        )
      ) {
        return;
      }

      const datos =
        event.data || {};

      /*
         El puente persistente se identifica por el origen
         Apps Script + la ventana del iframe que nosotros creamos.
      */
      if (
        datos.canal === "CET34" &&
        datos.tipo === "puente_listo"
      ) {

        if (
          puenteIframe &&
          event.source ===
            puenteIframe.contentWindow
        ) {

          puenteListo =
            true;

          puenteInicializacion =
            true;

          console.info(
            "CET34 OPT3: PUENTE PERSISTENTE LISTO."
          );

        }

        return;
      }

      if (
        datos.canal !== "CET34" ||
        datos.tipo !== "respuesta" ||
        !datos.id
      ) {
        return;
      }

      const pendiente =
        pendientes.get(
          datos.id
        );

      if (!pendiente) {
        return;
      }

      clearTimeout(
        pendiente.temporizador
      );

      pendientes.delete(
        datos.id
      );

      /*
         Solo el transporte legacy utiliza un iframe/form
         temporal. El puente persistente se conserva.
      */
      if (
        pendiente.transporte ===
        "legacy"
      ) {

        limpiar(
          pendiente.form,
          pendiente.iframe
        );

      }

      if (
        datos.ok === true
      ) {

        pendiente.resolve(
          datos.datos
        );

      } else {

        pendiente.reject(
          new Error(
            datos.mensaje ||
            "Error del servidor."
          )
        );

      }

    }
  );

  /*
     El listener ya está instalado. Iniciamos el puente en paralelo
     con la carga de Google Identity Services.
  */
  iniciarPuentePersistente_();


  /* ==========================================================
     API REUTILIZABLE
     ========================================================== */

  async function requireAuth(
    opciones
  ) {

    opciones =
      opciones || {};

    const rolesPermitidos =
      Array.isArray(
        opciones.roles
      )
        ? opciones.roles
        : [
            "ADMINISTRADOR",
            "DOCENTE"
          ];

    if (
      usuario &&
      idToken
    ) {

      if (
        rolesPermitidos.indexOf(
          usuario.rol
        ) === -1
      ) {

        mostrarAcceso(
          "Tu cuenta está activa, pero no tiene permiso para acceder a esta sección.",
          false
        );

        throw new Error(
          "ROL_NO_AUTORIZADO"
        );

      }

      return usuario;

    }

    await login(
      Boolean(
        opciones.cambiarCuenta
      )
    );

    /*
       El callback de Google ocurre de forma asíncrona.
       Esperamos hasta que el usuario quede autorizado o
       se produzca un rechazo.
    */

    const limite =
      Date.now() + CONFIG.TIMEOUT;

    return new Promise(
      function (resolve, reject) {

        const revisar =
          function () {

            if (
              usuario &&
              idToken
            ) {

              if (
                rolesPermitidos.indexOf(
                  usuario.rol
                ) === -1
              ) {

                mostrarAcceso(
                  "Tu cuenta está activa, pero no tiene permiso para acceder a esta sección.",
                  true
                );

                reject(
                  new Error(
                    "ROL_NO_AUTORIZADO"
                  )
                );

                return;

              }

              resolve(
                usuario
              );

              return;

            }

            if (
              Date.now() >= limite
            ) {

              reject(
                new Error(
                  "TIEMPO_AUTENTICACION_AGOTADO"
                )
              );

              return;

            }

            setTimeout(
              revisar,
              150
            );

          };

        revisar();

      }
    );

  }


  async function request(
    action,
    parametros
  ) {

    if (
      !idToken ||
      !usuario
    ) {

      throw new Error(
        "AUTENTICACION_REQUERIDA"
      );

    }

    const datos =
      Object.assign(
        {},
        parametros || {},
        {
          token:
            idToken
        }
      );

    const resultado =
      await enviarPOST(
        action,
        datos
      );

    /*
       El servidor puede rechazar una sesión que ya no sea
       válida. En ese caso se limpia el estado local.
    */
    if (
      resultado &&
      resultado.autorizado === false
    ) {

      logout(
        false
      );

      throw new Error(
        resultado.mensaje ||
        "Acceso denegado."
      );

    }

    return resultado;

  }


  function getUser() {
    return usuario;
  }


  function getToken() {

    if (!idToken) {

      throw new Error(
        "No existe una sesión autenticada."
      );

    }

    return idToken;

  }


  function isAuthenticated() {

    return Boolean(
      idToken &&
      usuario
    );

  }


  function logout(
    mostrar
  ) {

    idToken =
      null;

    usuario =
      null;

    try {

      if (
        window.google &&
        google.accounts &&
        google.accounts.id
      ) {

        google.accounts.id.disableAutoSelect();

      }

    } catch (_) {}

    if (
      mostrar !== false
    ) {

      mostrarAcceso(
        "Tu sesión se cerró. Selecciona una cuenta de Google para continuar.",
        true
      );

    }

  }


  function getConfig() {

    return Object.freeze({
      appUrl:
        CONFIG.APP_URL,

      googleClientId:
        CONFIG.GOOGLE_CLIENT_ID

    });

  }


  /* ==========================================================
     EXPONER ÚNICAMENTE LA API PÚBLICA
     ========================================================== */

  window.CET34Auth =
    Object.freeze({

      requireAuth:
        requireAuth,

      request:
        request,

      getUser:
        getUser,

      getToken:
        getToken,

      isAuthenticated:
        isAuthenticated,

      login:
        login,

      logout:
        logout,

      getConfig:
        getConfig

    });


})(window);
