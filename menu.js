class CET34Menu extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.configurarEventos();
    this.marcarPaginaActual();
  }

  render() {

    this.shadowRoot.innerHTML = `

      <style>

        :host {
          display: block;
          position: relative;
          z-index: 9999;
        }

        * {
          box-sizing: border-box;
        }

        .menu-wrapper {
          width: 100%;
          font-family:
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        /* =========================
           BARRA PRINCIPAL
           ========================= */

        .navbar {
          width: 100%;
          min-height: 68px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 10px 18px;

          background: linear-gradient(
            135deg,
            #7a003c,
            #8f0047
          );

          color: white;

          box-shadow:
            0 4px 18px rgba(0,0,0,.15);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;

          text-decoration: none;
          color: white;
        }

        .brand-icon {
          width: 42px;
          height: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: rgba(255,255,255,.15);

          font-size: 22px;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .brand-title {
          font-size: 17px;
          font-weight: 800;
        }

        .brand-subtitle {
          font-size: 11px;
          opacity: .8;
          margin-top: 3px;
        }

        /* =========================
           BOTÓN HAMBURGUESA
           ========================= */

        .menu-button {
          width: 44px;
          height: 44px;

          border: 0;
          border-radius: 12px;

          background: rgba(255,255,255,.12);

          color: white;

          font-size: 24px;

          cursor: pointer;

          display: flex;
          align-items: center;
          justify-content: center;

          transition:
            background .2s ease,
            transform .2s ease;
        }

        .menu-button:hover {
          background: rgba(255,255,255,.2);
        }

        .menu-button.active {
          transform: rotate(90deg);
        }

        /* =========================
           PANEL DEL MENÚ
           ========================= */

        .menu-panel {
          position: absolute;

          top: 72px;
          right: 12px;

          width: min(320px, calc(100vw - 24px));

          padding: 10px;

          background: rgba(255,255,255,.96);

          border: 1px solid #e2e8f0;

          border-radius: 18px;

          box-shadow:
            0 18px 45px rgba(15,23,42,.22);

          backdrop-filter: blur(12px);

          opacity: 0;
          visibility: hidden;
          transform:
            translateY(-10px)
            scale(.97);

          transition:
            opacity .2s ease,
            transform .2s ease,
            visibility .2s ease;
        }

        .menu-panel.open {
          opacity: 1;
          visibility: visible;

          transform:
            translateY(0)
            scale(1);
        }

        /* =========================
           CABECERA
           ========================= */

        .menu-header {
          padding: 14px;

          border-bottom: 1px solid #e5e7eb;

          margin-bottom: 7px;
        }

        .menu-header-title {
          color: #111827;

          font-size: 15px;
          font-weight: 800;
        }

        .menu-header-subtitle {
          margin-top: 3px;

          color: #64748b;

          font-size: 12px;
        }

        /* =========================
           OPCIONES
           ========================= */

        .menu-link {

          display: flex;
          align-items: center;

          gap: 12px;

          width: 100%;

          padding: 13px 14px;

          margin: 3px 0;

          border-radius: 13px;

          text-decoration: none;

          color: #334155;

          font-size: 14px;

          font-weight: 700;

          transition:
            background .18s ease,
            transform .18s ease,
            color .18s ease;
        }

        .menu-link:hover {
          background: #f1f5f9;
          transform: translateX(2px);
        }

        .menu-link.active {
          background: #fce7f3;
          color: #7a003c;
        }

        .menu-icon {

          width: 34px;
          height: 34px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background: #f1f5f9;

          font-size: 18px;
        }

        .menu-link.active .menu-icon {
          background: white;
        }

        /* =========================
           SEPARADOR
           ========================= */

        .menu-separator {
          height: 1px;

          background: #e5e7eb;

          margin: 9px 4px;
        }

        /* =========================
           PIE
           ========================= */

        .menu-footer {
          padding: 10px 14px 8px;

          color: #94a3b8;

          font-size: 10px;

          text-align: center;
        }

        /* =========================
           PC
           ========================= */

        @media (min-width: 850px) {

          .navbar {
            padding-left: 28px;
            padding-right: 28px;
          }

          .menu-panel {

            right: 28px;

            width: 340px;
          }

        }

      </style>


      <div class="menu-wrapper">

        <nav class="navbar">

          <a
            class="brand"
            href="./inicio.html"
          >

            <div class="brand-icon">
              🏫
            </div>

            <div class="brand-text">

              <div class="brand-title">
                CET 34
              </div>

              <div class="brand-subtitle">
                Sistema de Asistencia Digital
              </div>

            </div>

          </a>


          <button
            class="menu-button"
            id="menuButton"
            aria-label="Abrir menú"
            aria-expanded="false"
          >
            ☰
          </button>

        </nav>


        <div
          class="menu-panel"
          id="menuPanel"
        >

          <div class="menu-header">

            <div class="menu-header-title">
              Menú principal
            </div>

            <div class="menu-header-subtitle">
              CET 34 · Sistema de Asistencia
            </div>

          </div>


          <a
            href="./inicio.html"
            class="menu-link"
            data-page="inicio.html"
          >

            <span class="menu-icon">
              🏠
            </span>

            <span>
              Inicio
            </span>

          </a>


          <a
            href="./index.html"
            class="menu-link"
            data-page="index.html"
          >

            <span class="menu-icon">
              📷
            </span>

            <span>
              Registro
            </span>

          </a>


          <a
            href="./reportes.html"
            class="menu-link"
            data-page="reportes.html"
          >

            <span class="menu-icon">
              📊
            </span>

            <span>
              Reportes
            </span>

          </a>


          <a
            href="./historial.html"
            class="menu-link"
            data-page="historial.html"
          >

            <span class="menu-icon">
              🕘
            </span>

            <span>
              Historial
            </span>

          </a>


          <a
            href="./configuracion.html"
            class="menu-link"
            data-page="configuracion.html"
          >

            <span class="menu-icon">
              ⚙️
            </span>

            <span>
              Configuración
            </span>

          </a>


          <div class="menu-separator"></div>


          <div class="menu-footer">

            CET 34 · Sistema de Asistencia Digital

          </div>

        </div>

      </div>
    `;
  }


  configurarEventos() {

    const button =
      this.shadowRoot.querySelector("#menuButton");

    const panel =
      this.shadowRoot.querySelector("#menuPanel");


    button.addEventListener("click", () => {

      const abierto =
        panel.classList.toggle("open");

      button.classList.toggle(
        "active",
        abierto
      );

      button.setAttribute(
        "aria-expanded",
        abierto
      );

    });


    /*
      Cerrar al hacer clic fuera
      del componente.
    */

    document.addEventListener("click", (event) => {

      if (!this.contains(event.target)) {

        panel.classList.remove("open");

        button.classList.remove("active");

        button.setAttribute(
          "aria-expanded",
          "false"
        );

      }

    });

  }


  marcarPaginaActual() {

    const paginaActual =
      window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();


    const pagina =
      paginaActual || "inicio.html";


    const enlaces =
      this.shadowRoot.querySelectorAll(
        ".menu-link"
      );


    enlaces.forEach(enlace => {

      const paginaEnlace =
        enlace.dataset.page
          .toLowerCase();


      if (paginaEnlace === pagina) {

        enlace.classList.add("active");

      }

    });

  }

}


/*
========================================
REGISTRAR COMPONENTE
========================================
*/

if (!customElements.get("cet34-menu")) {

  customElements.define(
    "cet34-menu",
    CET34Menu
  );

}
