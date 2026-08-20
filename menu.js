/* ============================================================
   CET 34 · MENÚ Y ENCABEZADO COMÚN
   ============================================================

   Este componente contiene:

   ✓ Encabezado institucional
   ✓ Insignia izquierda
   ✓ Nombre CET 34
   ✓ Subtítulo
   ✓ Botón de navegación
   ✓ Menú común
   ✓ Detección automática de página activa
   ✓ Diseño responsive para celular y PC
   ✓ Animación de apertura/cierre
   ✓ Cierre al hacer clic fuera
   ✓ Cierre con tecla ESC
   ✓ No modifica la autenticación

   Uso:

   <cet34-menu></cet34-menu>

   y:

   <script src="./menu.js"></script>

   ============================================================ */

(function () {

  "use strict";


  /* ==========================================================
     COMPONENTE
     ========================================================== */

  class CET34Menu extends HTMLElement {

    constructor() {

      super();

      this.attachShadow({
        mode: "open"
      });

    }


    /* ========================================================
       CONECTAR COMPONENTE
       ======================================================== */

    connectedCallback() {

      this.render();

      this.inicializar();

    }


    /* ========================================================
       HTML + CSS
       ======================================================== */

    render() {

      this.shadowRoot.innerHTML = `

        <style>

          /* ==================================================
             VARIABLES
             ================================================== */

          :host {

            --vino-900: #4a001d;
            --vino-800: #620026;
            --vino-700: #78002f;
            --vino-600: #8d0038;

            --vino-claro: #f9edf2;

            --blanco: #ffffff;

            --texto: #172033;
            --texto-sec: #64748b;

            --borde: #e2e8f0;

            --sombra:
              0 18px 45px
              rgba(15, 23, 42, .18);

            --sombra-header:
              0 5px 18px
              rgba(74, 0, 29, .22);

            display: block;

            font-family:
              Arial,
              Helvetica,
              sans-serif;

          }


          /* ==================================================
             ENCABEZADO
             ================================================== */

          .header {

            position: relative;

            z-index: 10000;

            min-height: 108px;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 16px 105px 16px 105px;

            color: #fff;

            background:
              linear-gradient(
                135deg,
                var(--vino-900),
                var(--vino-700) 55%,
                var(--vino-800)
              );

            box-shadow: var(--sombra-header);

          }


          /* Línea inferior institucional */

          .header::after {

            content: "";

            position: absolute;

            left: 0;
            right: 0;
            bottom: 0;

            height: 3px;

            background:
              rgba(255,255,255,.18);

            pointer-events: none;

          }


          /* ==================================================
             INSIGNIA IZQUIERDA
             ================================================== */

          .insignia {

            position: absolute;

            top: 50%;

            left: 24px;

            width: 64px;
            height: 64px;

            transform:
              translateY(-50%);

            display: flex;

            align-items: center;

            justify-content: center;

            overflow: hidden;

            border:
              1px solid
              rgba(255,255,255,.22);

            border-radius: 50%;

            background:
              rgba(255,255,255,.10);

            box-shadow:
              0 8px 20px
              rgba(0,0,0,.12);

          }


          .insignia img {

            width: 100%;
            height: 100%;

            object-fit: contain;

          }


          /* ==================================================
             CENTRO
             ================================================== */

          .header-centro {

            text-align: center;

            max-width: 620px;

            pointer-events: none;

          }


          .header-centro h1 {

            margin: 0;

            font-size:
              clamp(24px, 3vw, 31px);

            font-weight: 900;

            letter-spacing: -.5px;

          }


          .header-centro p {

            margin: 6px 0 0;

            font-size: 12px;

            font-weight: 700;

            letter-spacing: 1.5px;

            opacity: .9;

          }


          /* ==================================================
             BOTÓN MENÚ
             ================================================== */

          .menu-boton {

            position: absolute;

            top: 50%;
            right: 24px;

            width: 58px;
            height: 58px;

            transform:
              translateY(-50%);

            display: flex;

            flex-direction: column;

            align-items: center;

            justify-content: center;

            gap: 5px;

            border:
              1px solid
              rgba(255,255,255,.20);

            border-radius: 50%;

            background:
              transparent;

            color: #fff;

            cursor: pointer;

            transition:
              background .22s ease,
              border-color .22s ease,
              transform .22s ease,
              box-shadow .22s ease;

            -webkit-tap-highlight-color:
              transparent;

          }


          .menu-boton:hover {

            background:
              rgba(255,255,255,.10);

            border-color:
              rgba(255,255,255,.35);

          }


          .menu-boton:active {

            transform:
              translateY(-50%)
              scale(.94);

          }


          .menu-boton.abierto {

            background:
              rgba(255,255,255,.16);

            border-color:
              rgba(255,255,255,.38);

            box-shadow:
              0 8px 20px
              rgba(0,0,0,.16);

          }


          /* ==================================================
             ICONO HAMBURGUESA
             ================================================== */

          .linea {

            width: 23px;
            height: 2.5px;

            border-radius: 999px;

            background: #fff;

            transition:
              transform .25s ease,
              opacity .20s ease,
              width .25s ease;

          }


          .menu-boton.abierto
          .linea:nth-child(1) {

            transform:
              translateY(7.5px)
              rotate(45deg);

          }


          .menu-boton.abierto
          .linea:nth-child(2) {

            opacity: 0;

            width: 0;

          }


          .menu-boton.abierto
          .linea:nth-child(3) {

            transform:
              translateY(-7.5px)
              rotate(-45deg);

          }


          /* ==================================================
             PANEL DEL MENÚ
             ================================================== */

          .menu-panel {

            position: absolute;

            z-index: 9999;

            top: calc(100% + 10px);

            right: 18px;

            width: min(
              330px,
              calc(100vw - 28px)
            );

            padding: 10px;

            border:
              1px solid
              rgba(226,232,240,.95);

            border-radius: 20px;

            background:
              rgba(255,255,255,.97);

            box-shadow:
              var(--sombra);

            backdrop-filter:
              blur(14px);

            -webkit-backdrop-filter:
              blur(14px);

            opacity: 0;

            visibility: hidden;

            transform:
              translateY(-10px)
              scale(.97);

            transform-origin:
              top right;

            transition:
              opacity .22s ease,
              transform .22s ease,
              visibility .22s ease;

          }


          .menu-panel.abierto {

            opacity: 1;

            visibility: visible;

            transform:
              translateY(0)
              scale(1);

          }


          /* ==================================================
             CABECERA DEL MENÚ
             ================================================== */

          .menu-identidad {

            padding:
              12px 13px 10px;

            border-bottom:
              1px solid
              var(--borde);

          }


          .menu-identidad-titulo {

            color:
              var(--texto);

            font-size: 14px;

            font-weight: 900;

          }


          .menu-identidad-subtitulo {

            margin-top: 3px;

            color:
              var(--texto-sec);

            font-size: 11px;

          }


          /* ==================================================
             LISTA
             ================================================== */

          .menu-lista {

            display: grid;

            gap: 4px;

            margin-top: 7px;

          }


          .menu-enlace {

            display: flex;

            align-items: center;

            gap: 12px;

            min-height: 52px;

            padding:
              9px 12px;

            border:
              1px solid
              transparent;

            border-radius: 14px;

            color:
              var(--texto);

            text-decoration: none;

            transition:
              background .20s ease,
              border-color .20s ease,
              transform .20s ease,
              color .20s ease;

          }


          .menu-enlace:hover {

            background:
              #f8fafc;

            border-color:
              var(--borde);

            transform:
              translateX(2px);

          }


          .menu-enlace:active {

            transform:
              scale(.98);

          }


          /* ==================================================
             ICONOS
             ================================================== */

          .menu-icono {

            flex:
              0 0 auto;

            width: 38px;
            height: 38px;

            display: flex;

            align-items: center;

            justify-content: center;

            border-radius: 12px;

            background:
              #f1f5f9;

            font-size: 19px;

            transition:
              background .20s ease;

          }


          .menu-texto {

            min-width: 0;

            flex: 1;

          }


          .menu-titulo {

            font-size: 13px;

            font-weight: 900;

          }


          .menu-descripcion {

            margin-top: 2px;

            color:
              var(--texto-sec);

            font-size: 10px;

            line-height: 1.3;

          }


          /* ==================================================
             PÁGINA ACTIVA
             ================================================== */

          .menu-enlace.activo {

            background:
              var(--vino-claro);

            border-color:
              #efd5df;

            color:
              var(--vino-800);

          }


          .menu-enlace.activo
          .menu-icono {

            background:
              rgba(120,0,47,.10);

          }


          .menu-enlace.activo
          .menu-descripcion {

            color:
              var(--vino-700);

          }


          /* ==================================================
             INDICADOR ACTIVO
             ================================================== */

          .indicador {

            width: 7px;
            height: 7px;

            flex:
              0 0 auto;

            border-radius: 50%;

            background:
              var(--vino-700);

            opacity: 0;

            transform:
              scale(.5);

            transition:
              opacity .20s ease,
              transform .20s ease;

          }


          .menu-enlace.activo
          .indicador {

            opacity: 1;

            transform:
              scale(1);

          }


          /* ==================================================
             CERRAR / FONDO
             ================================================== */

          .menu-fondo {

            position: fixed;

            z-index: 9998;

            inset: 0;

            background:
              rgba(15,23,42,.18);

            backdrop-filter:
              blur(1px);

            opacity: 0;

            visibility: hidden;

            transition:
              opacity .22s ease,
              visibility .22s ease;

          }


          .menu-fondo.abierto {

            opacity: 1;

            visibility: visible;

          }


          /* ==================================================
             ACCESIBILIDAD
             ================================================== */

          .menu-boton:focus-visible,
          .menu-enlace:focus-visible {

            outline:
              3px solid
              rgba(255,255,255,.55);

            outline-offset: 2px;

          }


          .menu-enlace:focus-visible {

            outline-color:
              rgba(120,0,47,.35);

          }


          /* ==================================================
             TABLET
             ================================================== */

          @media (max-width: 850px) {

            .header {

              min-height: 96px;

              padding:
                14px 82px;

            }


            .insignia {

              left: 14px;

              width: 55px;
              height: 55px;

            }


            .menu-boton {

              right: 14px;

              width: 52px;
              height: 52px;

            }

          }


          /* ==================================================
             CELULAR
             ================================================== */

          @media (max-width: 560px) {

            .header {

              min-height: 88px;

              padding:
                12px 68px;

            }


            .insignia {

              left: 10px;

              width: 48px;
              height: 48px;

            }


            .header-centro h1 {

              font-size: 22px;

            }


            .header-centro p {

              margin-top: 4px;

              font-size: 10px;

              letter-spacing: 1px;

            }


            .menu-boton {

              right: 10px;

              width: 48px;
              height: 48px;

            }


            .menu-panel {

              top:
                calc(100% + 8px);

              right: 8px;

              width:
                calc(100vw - 16px);

              max-width:
                none;

              border-radius:
                18px;

            }


            .menu-enlace {

              min-height: 55px;

            }


            .menu-icono {

              width: 40px;
              height: 40px;

            }

          }


          /* ==================================================
             PANTALLA MUY PEQUEÑA
             ================================================== */

          @media (max-width: 360px) {

            .header {

              padding-left: 62px;

              padding-right: 62px;

            }


            .header-centro h1 {

              font-size: 19px;

            }


            .header-centro p {

              font-size: 9px;

            }


            .insignia {

              width: 44px;
              height: 44px;

              left: 8px;

            }


            .menu-boton {

              width: 44px;
              height: 44px;

              right: 8px;

            }

          }

        </style>


        <!-- ================================================
             ENCABEZADO
             ================================================ -->

        <header
          class="header"
          id="cet34Header"
        >

          <!-- INSIGNIA IZQUIERDA -->

          <div
            class="insignia"
          >

            <img
              src="./insignia-izquierda.png"
              alt="Insignia institucional CET 34"
            >

          </div>


          <!-- CENTRO -->

          <div
            class="header-centro"
          >

            <h1>
              🏫 CET 34
            </h1>

            <p>
              CONTROL DE ASISTENCIA QR
            </p>

          </div>


          <!-- BOTÓN MENÚ -->

          <button
            class="menu-boton"
            type="button"
            aria-label="Abrir menú"
            aria-expanded="false"
            aria-controls="cet34MenuPanel"
          >

            <span class="linea"></span>
            <span class="linea"></span>
            <span class="linea"></span>

          </button>


          <!-- FONDO -->

          <div
            class="menu-fondo"
            id="cet34MenuFondo"
          ></div>


          <!-- PANEL -->

          <nav
            class="menu-panel"
            id="cet34MenuPanel"
            aria-label="Navegación principal"
          >

            <div
              class="menu-identidad"
            >

              <div
                class="menu-identidad-titulo"
              >
                🏫 CET 34
              </div>

              <div
                class="menu-identidad-subtitulo"
              >
                Sistema de Asistencia Digital
              </div>

            </div>


            <div
              class="menu-lista"
            >

              <!-- INICIO -->

              <a
                class="menu-enlace"
                data-pagina="inicio"
                href="./inicio.html"
              >

                <span
                  class="menu-icono"
                >
                  🏠
                </span>

                <span
                  class="menu-texto"
                >

                  <span
                    class="menu-titulo"
                  >
                    Inicio
                  </span>

                  <span
                    class="menu-descripcion"
                  >
                    Presentación del sistema
                  </span>

                </span>

                <span
                  class="indicador"
                  aria-hidden="true"
                ></span>

              </a>


              <!-- REGISTRO -->

              <a
                class="menu-enlace"
                data-pagina="registro"
                href="./index.html"
              >

                <span
                  class="menu-icono"
                >
                  📷
                </span>

                <span
                  class="menu-texto"
                >

                  <span
                    class="menu-titulo"
                  >
                    Registro
                  </span>

                  <span
                    class="menu-descripcion"
                  >
                    Control de asistencia QR
                  </span>

                </span>

                <span
                  class="indicador"
                  aria-hidden="true"
                ></span>

              </a>


              <!-- REPORTES -->

              <a
                class="menu-enlace"
                data-pagina="reportes"
                href="./reportes.html"
              >

                <span
                  class="menu-icono"
                >
                  📊
                </span>

                <span
                  class="menu-texto"
                >

                  <span
                    class="menu-titulo"
                  >
                    Reportes
                  </span>

                  <span
                    class="menu-descripcion"
                  >
                    Resumen y control por sección
                  </span>

                </span>

                <span
                  class="indicador"
                  aria-hidden="true"
                ></span>

              </a>


              <!-- HISTORIAL -->

              <a
                class="menu-enlace"
                data-pagina="historial"
                href="./historial.html"
              >

                <span
                  class="menu-icono"
                >
                  🕘
                </span>

                <span
                  class="menu-texto"
                >

                  <span
                    class="menu-titulo"
                  >
                    Historial
                  </span>

                  <span
                    class="menu-descripcion"
                  >
                    Consulta de registros
                  </span>

                </span>

                <span
                  class="indicador"
                  aria-hidden="true"
                ></span>

              </a>


              <!-- CONFIGURACIÓN -->

              <a
                class="menu-enlace"
                data-pagina="configuracion"
                href="./configuracion.html"
              >

                <span
                  class="menu-icono"
                >
                  ⚙️
                </span>

                <span
                  class="menu-texto"
                >

                  <span
                    class="menu-titulo"
                  >
                    Configuración
                  </span>

                  <span
                    class="menu-descripcion"
                  >
                    Estudiantes y horarios
                  </span>

                </span>

                <span
                  class="indicador"
                  aria-hidden="true"
                ></span>

              </a>

            </div>

          </nav>

        </header>

      `;

    }


    /* ========================================================
       INICIALIZAR
       ======================================================== */

    inicializar() {

      const boton =
        this.shadowRoot.querySelector(
          ".menu-boton"
        );

      const panel =
        this.shadowRoot.querySelector(
          ".menu-panel"
        );

      const fondo =
        this.shadowRoot.querySelector(
          ".menu-fondo"
        );

      const enlaces =
        this.shadowRoot.querySelectorAll(
          ".menu-enlace"
        );


      /* -----------------------------------------------
         ABRIR / CERRAR
         ----------------------------------------------- */

      boton.addEventListener(
        "click",
        () => {

          const abierto =
            panel.classList.contains(
              "abierto"
            );

          if (abierto) {

            this.cerrar();

          } else {

            this.abrir();

          }

        }
      );


      /* -----------------------------------------------
         FONDO
         ----------------------------------------------- */

      fondo.addEventListener(
        "click",
        () => {

          this.cerrar();

        }
      );


      /* -----------------------------------------------
         ENLACES
         ----------------------------------------------- */

      enlaces.forEach(
        enlace => {

          enlace.addEventListener(
            "click",
            () => {

              this.cerrar();

            }
          );

        }
      );


      /* -----------------------------------------------
         ESC
         ----------------------------------------------- */

      document.addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Escape"
          ) {

            this.cerrar();

          }

        }
      );


      /* -----------------------------------------------
         PÁGINA ACTIVA
         ----------------------------------------------- */

      this.marcarPaginaActual();

    }


    /* ========================================================
       ABRIR
       ======================================================== */

    abrir() {

      const boton =
        this.shadowRoot.querySelector(
          ".menu-boton"
        );

      const panel =
        this.shadowRoot.querySelector(
          ".menu-panel"
        );

      const fondo =
        this.shadowRoot.querySelector(
          ".menu-fondo"
        );


      boton.classList.add(
        "abierto"
      );

      panel.classList.add(
        "abierto"
      );

      fondo.classList.add(
        "abierto"
      );


      boton.setAttribute(
        "aria-expanded",
        "true"
      );

      boton.setAttribute(
        "aria-label",
        "Cerrar menú"
      );

    }


    /* ========================================================
       CERRAR
       ======================================================== */

    cerrar() {

      const boton =
        this.shadowRoot.querySelector(
          ".menu-boton"
        );

      const panel =
        this.shadowRoot.querySelector(
          ".menu-panel"
        );

      const fondo =
        this.shadowRoot.querySelector(
          ".menu-fondo"
        );


      boton.classList.remove(
        "abierto"
      );

      panel.classList.remove(
        "abierto"
      );

      fondo.classList.remove(
        "abierto"
      );


      boton.setAttribute(
        "aria-expanded",
        "false"
      );

      boton.setAttribute(
        "aria-label",
        "Abrir menú"
      );

    }


    /* ========================================================
       IDENTIFICAR PÁGINA ACTUAL
       ======================================================== */

    marcarPaginaActual() {

      let archivo =
        window.location.pathname
          .split("/")
          .pop()
          .toLowerCase();


      /*
         Si GitHub abre la raíz:

         /cet34-asistencia/

         se considera INICIO.
      */

      if (
        !archivo ||
        archivo === "/"
      ) {

        archivo =
          "inicio.html";

      }


      let paginaActual =
        "inicio";


      if (
        archivo === "index.html"
      ) {

        paginaActual =
          "registro";

      }

      else if (
        archivo === "reportes.html"
      ) {

        paginaActual =
          "reportes";

      }

      else if (
        archivo === "historial.html"
      ) {

        paginaActual =
          "historial";

      }

      else if (
        archivo === "configuracion.html"
      ) {

        paginaActual =
          "configuracion";

      }

      else if (
        archivo === "inicio.html"
      ) {

        paginaActual =
          "inicio";

      }


      const enlaces =
        this.shadowRoot.querySelectorAll(
          ".menu-enlace"
        );


      enlaces.forEach(
        enlace => {

          const esActual =
            enlace.dataset.pagina ===
            paginaActual;

          enlace.classList.toggle(
            "activo",
            esActual
          );

        }
      );

    }

  }


  /* ==========================================================
     REGISTRAR COMPONENTE
     ========================================================== */

  if (
    !customElements.get(
      "cet34-menu"
    )
  ) {

    customElements.define(
      "cet34-menu",
      CET34Menu
    );

  }


})();
