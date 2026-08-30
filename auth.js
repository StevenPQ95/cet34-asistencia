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

   Seguridad / sesión OPT4.1-S:
   - El ID Token de Google vive solo durante el inicio de sesión.
   - Después de validar Google, CET34 crea una sesión propia.
   - La sesión CET34 se guarda en sessionStorage.
   - El ID Token NO se guarda en localStorage ni sessionStorage.
   - Las peticiones privadas utilizan sessionId.
   - Apps Script valida la sesión y el rol en cada petición privada.
   - La sesión dura 4 horas o hasta cerrar la pestaña/cerrar sesión.
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
  let sesion = null;
  let temporizadorExpiracionSesion = null;
  let recuperacionSesionEnCurso = null;
  let googleInicializado = false;
  let loginEnCurso = null;
  let contador = 0;

  const SESSION_STORAGE_KEY = "CET34_SESION";

  /*
     OPTIMIZACIÓN 4.1 · PUENTE PERSISTENTE CON HANDSHAKE
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
  let puentePingEnviado = false;
  let puenteIntentos = 0;

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

          <button
            id="cet34VolverInicio"
            type="button"
            style="
              width:100%;
              border:0;
              border-radius:14px;
              padding:12px 16px;
              font-size:14px;
              font-weight:800;
              cursor:pointer;
              background:#f1f5f9;
              color:#334155;
            "
          >
            🏠 Volver al inicio
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    document
      .getElementById("cet34CambiarCuenta")
      .addEventListener(
        "click",
        async function () {
          try {
            await logout(false);
          } catch (_) {}

          login(true);
        }
      );

    document
      .getElementById("cet34VolverInicio")
      .addEventListener(
        "click",
        function () {
          window.location.href = "./inicio.html";
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
     OPT4.1-S · SESIÓN CET34 EN SESSIONSTORAGE
     ========================================================== */

  function limpiarTemporizadorSesion_() {

    if (temporizadorExpiracionSesion) {
      clearTimeout(temporizadorExpiracionSesion);
      temporizadorExpiracionSesion = null;
    }

  }


  function notificarCambioSesion_() {

    try {

      window.dispatchEvent(
        new CustomEvent(
          "cet34:sesion-cambio",
          {
            detail: {
              usuario:
                usuario
                  ? Object.assign({}, usuario)
                  : null,
              sesionActiva:
                Boolean(
                  sesion &&
                  usuario &&
                  !sesionExpiradaLocal_()
                )
            }
          }
        )
      );

    } catch (_) {

      // Compatibilidad con navegadores que no permitan
      // construir CustomEvent de esta forma.
      try {
        window.dispatchEvent(
          new Event("cet34:sesion-cambio")
        );
      } catch (_) {}

    }

  }


  function limpiarSesionLocal_() {

    limpiarTemporizadorSesion_();

    sesion = null;
    usuario = null;
    idToken = null;

    try {
      sessionStorage.removeItem(
        SESSION_STORAGE_KEY
      );
    } catch (_) {}

    // Avisamos inmediatamente al menú y a cualquier página
    // que necesite reflejar el cierre/expiración de sesión.
    notificarCambioSesion_();

  }


  function guardarSesionLocal_(datos) {

    const sessionId = String(
      datos && datos.sessionId || ""
    ).trim();

    const expiraEn = Number(
      datos && datos.expiraEn || 0
    );

    if (!sessionId || !expiraEn) {
      throw new Error(
        "RESPUESTA_SESION_INVALIDA"
      );
    }

    sesion = Object.freeze({
      sessionId: sessionId,
      correo: String(datos.correo || ""),
      nombre: String(datos.nombre || ""),
      rol: String(datos.rol || ""),
      estado: String(datos.estado || "ACTIVO"),
      creadoEn: Number(datos.creadoEn || Date.now()),
      expiraEn: expiraEn
    });

    usuario = Object.freeze({
      correo: sesion.correo,
      nombre: sesion.nombre,
      rol: sesion.rol,
      estado: sesion.estado
    });

    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(sesion)
      );
    } catch (error) {
      limpiarSesionLocal_();
      throw new Error(
        "No fue posible guardar la sesión de esta pestaña."
      );
    }

    programarExpiracionSesion_();

    // El menú y login.html reciben inmediatamente el nuevo estado.
    notificarCambioSesion_();

    return usuario;
  }


  function leerSesionLocal_() {

    let texto = null;

    try {
      texto = sessionStorage.getItem(
        SESSION_STORAGE_KEY
      );
    } catch (_) {
      return null;
    }

    if (!texto) {
      return null;
    }

    try {
      const datos = JSON.parse(texto);

      if (
        !datos ||
        !datos.sessionId ||
        !datos.expiraEn
      ) {
        return null;
      }

      return datos;

    } catch (_) {
      return null;
    }
  }


  function sesionExpiradaLocal_() {

    if (!sesion) {
      return true;
    }

    return Date.now() >= Number(
      sesion.expiraEn || 0
    );
  }


  function programarExpiracionSesion_() {

    limpiarTemporizadorSesion_();

    if (!sesion) {
      return;
    }

    const restante = Math.max(
      0,
      Number(sesion.expiraEn || 0) - Date.now()
    );

    temporizadorExpiracionSesion = setTimeout(
      function() {

        limpiarSesionLocal_();

        mostrarAcceso(
          "Tu sesión CET34 ha expirado. Vuelve a iniciar sesión para continuar.",
          true
        );

      },
      restante
    );
  }


  async function recuperarSesion_() {

    if (recuperacionSesionEnCurso) {
      return recuperacionSesionEnCurso;
    }

    recuperacionSesionEnCurso = (async function() {

      const datosLocal = leerSesionLocal_();

      if (!datosLocal) {
        return null;
      }

      if (
        Date.now() >= Number(datosLocal.expiraEn || 0)
      ) {
        limpiarSesionLocal_();
        return null;
      }

      try {

        mostrarAcceso(
          "Comprobando tu sesión CET34...",
          false
        );

        const datos = await enviarPOST(
          "validarsesioncet34",
          {
            sessionId:
              String(datosLocal.sessionId)
          }
        );

        if (
          datos &&
          datos.exito === true &&
          datos.autorizado === true &&
          datos.sesionActiva === true
        ) {

          guardarSesionLocal_(datos);
          mostrarUsuarioEnPanel(datos);
          ocultarAcceso();

          return usuario;
        }

        limpiarSesionLocal_();
        return null;

      } catch (error) {

        console.warn(
          "CET34 AUTH: no se pudo recuperar la sesión.",
          error
        );

        // Si el servidor no responde, NO reutilizamos ciegamente
        // una sesión local. La sesión debe ser confirmada por el servidor.
        limpiarSesionLocal_();
        return null;
      }

    })().finally(function() {
      recuperacionSesionEnCurso = null;
    });

    return recuperacionSesionEnCurso;
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
          "crearsesioncet34",
          {
            token:
              idToken
          }
        );

      if (
        datos &&
        datos.exito === true &&
        datos.autorizado === true &&
        datos.sesionActiva === true &&
        datos.sessionId
      ) {

        guardarSesionLocal_(datos);

        // El ID Token de Google ya cumplió su función.
        // No se conserva como credencial de sesión.
        idToken = null;

        mostrarUsuarioEnPanel(
          datos
        );

        ocultarAcceso();

        return usuario;

      }

      idToken = null;
      limpiarSesionLocal_();

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

      idToken = null;
      limpiarSesionLocal_();

      console.error(
        "CET34 AUTH:",
        error
      );

      if (
        error &&
        error.message !== "CUENTA_NO_AUTORIZADA"
      ) {

        mostrarAcceso(
          "No se pudo crear la sesión CET34. Inténtalo nuevamente.",
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
     OPTIMIZACIÓN 4.1 · PUENTE PERSISTENTE CON HANDSHAKE
     ========================================================== */

  /* ==========================================================
     OPTIMIZACIÓN 4.1 · PUENTE PERSISTENTE CON HANDSHAKE
     ----------------------------------------------------------
     OPT3:
     - crea el iframe
     - espera "puente_listo"

     OPT4.1:
     - crea el iframe una sola vez
     - espera su carga
     - envía PING
     - espera PONG
     - solo entonces considera el puente realmente listo
     - mantiene POST tradicional como respaldo
     ========================================================== */

  function iniciarPuentePersistente_() {

    /*
       Si ya tenemos un puente confirmado,
       no hacemos absolutamente nada.
    */
    if (
      puenteIframe &&
      puenteListo
    ) {
      return;
    }

    /*
       Evita crear varios iframes simultáneamente.
    */
    if (puenteInicializacion) {
      return;
    }

    /*
       auth.js puede cargarse antes de <body>.
       Esperamos al DOM.
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
    puentePingEnviado = false;
    puenteIntentos++;

    try {

      const iframe =
        document.createElement("iframe");

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
         Cada creación utiliza una marca diferente
         para evitar respuestas antiguas.
      */
      const cacheBuster =
        Date.now() +
        "_" +
        puenteIntentos;

      iframe.src =
        CONFIG.APP_URL +
        "?action=puente&_cet34puente=4_1_" +
        cacheBuster;

      /*
         Cuando el iframe termina de cargar,
         comprobamos que realmente responde.
      */
      iframe.addEventListener(
        "load",
        function() {

          console.info(
            "CET34 OPT4.1: iframe del puente cargado."
          );

          /*
             Pequeño margen para que el listener
             interno de Apps Script quede instalado.
          */
          setTimeout(
            function() {

              if (
                puenteListo ||
                !puenteIframe
              ) {
                return;
              }

              try {

                puentePingEnviado = true;

                console.info(
                  "CET34 OPT4.1: enviando PING al puente..."
                );

                puenteIframe.contentWindow.postMessage(
                  {
                    canal: "CET34",
                    tipo: "ping"
                  },
                  "*"
                );

              } catch (error) {

                console.warn(
                  "CET34 OPT4.1: no se pudo enviar PING.",
                  error
                );

              }

            },
            150
          );

        }
      );

      document.body.appendChild(
        iframe
      );

      puenteIframe =
        iframe;

      console.info(
        "CET34 OPT4.1: iniciando puente persistente..."
      );

      /*
         El puente tiene hasta 8 segundos para
         demostrar que realmente funciona.

         IMPORTANTE:
         esto NO bloquea la aplicación.
         Si no responde, seguimos usando POST.
      */
      setTimeout(
        function() {

          if (
            !puenteListo
          ) {

            puenteInicializacion =
              false;

            puentePingEnviado =
              false;

            console.warn(
              "CET34 OPT4.1: puente no confirmado; se mantiene respaldo POST."
            );

          }

        },
        8000
      );

    } catch (error) {

      puenteInicializacion =
        false;

      puentePingEnviado =
        false;

      console.warn(
        "CET34 OPT4.1: no se pudo iniciar el puente persistente.",
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
      /*
         ==========================================================
         OPT4.1 · HANDSHAKE DEL PUENTE
         ==========================================================
      */

      if (
        datos.canal === "CET34" &&
        (
          datos.tipo === "puente_listo" ||
          datos.tipo === "pong"
        )
      ) {

        /*
           La respuesta debe proceder exactamente
           del iframe que creó esta página.
        */
        if (
          puenteIframe &&
          event.source ===
            puenteIframe.contentWindow
        ) {

          puenteListo =
            true;

          puenteInicializacion =
            true;

          puentePingEnviado =
            false;

          console.info(
            "CET34 OPT4.1: PUENTE PERSISTENTE LISTO.",
            {
              tipo: datos.tipo,
              origen: event.origin
            }
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

  // Pre-carga local únicamente para que isAuthenticated() y
  // el menú puedan conocer que existe una sesión en esta pestaña.
  // requireAuth() hará la validación real con el servidor.
  (function precargarSesionLocal_() {

    const datosLocal = leerSesionLocal_();

    if (
      datosLocal &&
      Number(datosLocal.expiraEn || 0) > Date.now()
    ) {

      try {
        guardarSesionLocal_(datosLocal);
      } catch (_) {
        limpiarSesionLocal_();
      }
    }

  })();


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

    // =====================================================
    // 1. SESIÓN YA CARGADA EN MEMORIA
    // =====================================================
    if (
      sesion &&
      usuario &&
      !sesionExpiradaLocal_()
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

        throw new Error(
          "ROL_NO_AUTORIZADO"
        );
      }

      return usuario;
    }

    // =====================================================
    // 2. RECUPERAR SESIÓN DE ESTA PESTAÑA
    // =====================================================
    const usuarioRecuperado =
      await recuperarSesion_();

    if (
      usuarioRecuperado
    ) {

      if (
        rolesPermitidos.indexOf(
          usuarioRecuperado.rol
        ) === -1
      ) {

        mostrarAcceso(
          "Tu cuenta está activa, pero no tiene permiso para acceder a esta sección.",
          true
        );

        throw new Error(
          "ROL_NO_AUTORIZADO"
        );
      }

      return usuarioRecuperado;
    }

    // =====================================================
    // 3. NO HAY SESIÓN → LOGIN GOOGLE
    // =====================================================
    await login(
      Boolean(
        opciones.cambiarCuenta
      )
    );

    const limite =
      Date.now() + CONFIG.TIMEOUT;

    return new Promise(
      function (resolve, reject) {

        const revisar =
          function () {

            if (
              sesion &&
              usuario &&
              !sesionExpiradaLocal_()
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
      !sesion ||
      !usuario ||
      sesionExpiradaLocal_()
    ) {

      limpiarSesionLocal_();

      throw new Error(
        "AUTENTICACION_REQUERIDA"
      );
    }

    const datos =
      Object.assign(
        {},
        parametros || {},
        {
          sessionId:
            sesion.sessionId
        }
      );

    const resultado =
      await enviarPOST(
        action,
        datos
      );

    // El servidor es la autoridad final sobre la sesión.
    if (
      resultado &&
      resultado.autorizado === false
    ) {

      limpiarSesionLocal_();

      throw new Error(
        resultado.mensaje ||
        "Acceso denegado."
      );
    }

    // Actualizamos la fecha de expiración si el servidor
    // la devuelve al validar la sesión.
    if (
      resultado &&
      resultado.expiraEn
    ) {
      sesion = Object.freeze(
        Object.assign(
          {},
          sesion,
          {
            expiraEn:
              Number(resultado.expiraEn)
          }
        )
      );

      try {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(sesion)
        );
      } catch (_) {}

      programarExpiracionSesion_();
    }

    return resultado;
  }


  function getUser() {
    return usuario;
  }


  function getToken() {

    // Compatibilidad con código antiguo.
    // La nueva sesión NO utiliza ni expone el ID Token de Google.
    if (sesion && sesion.sessionId) {
      return sesion.sessionId;
    }

    throw new Error(
      "No existe una sesión autenticada."
    );
  }


  function getSession() {
    if (
      !sesion ||
      sesionExpiradaLocal_()
    ) {
      return null;
    }

    return Object.freeze(
      Object.assign({}, sesion)
    );
  }


  function isAuthenticated() {

    return Boolean(
      sesion &&
      usuario &&
      !sesionExpiradaLocal_()
    );
  }


  function logout(
    mostrar
  ) {

    const sessionId =
      sesion &&
      sesion.sessionId
        ? sesion.sessionId
        : "";

    // Limpiamos inmediatamente el navegador para que la sesión
    // no pueda seguir utilizándose aunque el servidor tarde.
    limpiarSesionLocal_();

    try {

      if (
        window.google &&
        google.accounts &&
        google.accounts.id
      ) {

        google.accounts.id.disableAutoSelect();
      }

    } catch (_) {}

    // Cerramos la sesión también en Apps Script.
    if (sessionId) {

      enviarPOST(
        "cerrarsesioncet34",
        {
          sessionId:
            sessionId
        }
      )
      .catch(function(error) {
        console.warn(
          "CET34 AUTH: no se pudo cerrar la sesión en el servidor.",
          error
        );
      });
    }

    if (
      mostrar !== false
    ) {

      mostrarAcceso(
        "Tu sesión se cerró. Inicia sesión nuevamente para continuar.",
        true
      );
    }

    return true;
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

      getSession:
        getSession,

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
