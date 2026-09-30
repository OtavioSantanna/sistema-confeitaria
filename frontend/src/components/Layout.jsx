import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, CakeSlice, ClipboardList, BookOpen, Package } from 'lucide-react';

const MENU = [
  { para: '/encomendas', rotulo: 'Encomendas', icone: ClipboardList },
  { para: '/receitas', rotulo: 'Receitas', icone: BookOpen },
  { para: '/estoque', rotulo: 'Estoque', icone: Package },
];

function ItensMenu() {
  return MENU.map(({ para, rotulo, icone: Icone }) => (
    <NavLink key={para} to={para} className={({ isActive }) => `nav-item ${isActive ? 'ativo' : ''}`}>
      <span className="nav-icone"><Icone size={22} /></span>
      {rotulo}
    </NavLink>
  ));
}

export function Layout() {
  return (
    <div className="app">
      <nav className="sidenav" aria-label="Menu principal">
        <div className="marca"><CakeSlice size={24} /> Confeitaria</div>
        <ItensMenu />
      </nav>
      <div className="principal">
        <Outlet />
      </div>
      <nav className="bottomnav" aria-label="Menu principal">
        <ItensMenu />
      </nav>
    </div>
  );
}

// Barra superior de cada tela. `voltar` = rota (ou true para voltar no histórico).
export function Pagina({ titulo, voltar, acoes, children }) {
  const navigate = useNavigate();
  return (
    <>
      <header className="appbar">
        {voltar && (
          <button type="button" className="icon-btn appbar-voltar" aria-label="Voltar"
            onClick={() => (voltar === true ? navigate(-1) : navigate(voltar))}>
            <ArrowLeft size={22} />
          </button>
        )}
        <h1>{titulo}</h1>
        {acoes}
      </header>
      <main className="conteudo">{children}</main>
    </>
  );
}
