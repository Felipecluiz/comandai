import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="landing">
      <nav className="landing__nav">
        <span className="brand">
          <span className="brand__mark">◉</span> Comandaí
        </span>
        <Link to="/login" className="btn btn--ghost">
          Entrar
        </Link>
      </nav>

      <section className="landing__hero">
        <h1>
          Seu cardápio digital,
          <br />
          <span className="highlight">pedidos direto no WhatsApp.</span>
        </h1>
        <p>
          Monte o cardápio em minutos, compartilhe o link e receba pedidos organizados — no WhatsApp e num painel em
          tempo real para a cozinha.
        </p>
        <div className="landing__cta">
          <Link to="/cadastro" className="btn btn--primary btn--lg">
            Criar meu cardápio grátis
          </Link>
          <Link to="/r/pizzaria-do-ze" className="btn btn--lg">
            Ver exemplo
          </Link>
        </div>
      </section>

      <section className="landing__features">
        {[
          ["📱", "Cardápio com fotos", "Categorias, preços e produtos pausáveis quando acabar."],
          ["💬", "Pedido no WhatsApp", "O cliente finaliza e a mensagem chega formatada no seu número."],
          ["⚡", "Painel ao vivo", "Pedidos aparecem na hora, com som, em um kanban da cozinha."],
          ["📊", "Dashboard", "Faturamento, ticket médio e os produtos que mais vendem."],
        ].map(([icon, title, text]) => (
          <article key={title} className="card">
            <span className="feature-icon">{icon}</span>
            <h3>{title}</h3>
            <p className="muted">{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
