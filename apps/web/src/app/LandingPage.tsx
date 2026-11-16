import { Link } from "react-router-dom";
import "./landing.css";

/** Fotos do Unsplash (Unsplash License — uso livre). Produtos e padaria são fictícios. */
const photo = (id: string, w = 640) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const PHOTOS = {
  sourdough: "1780644804493-6ac6238e7ecf",
  croissant: "1679449223735-444c4f71f0dd",
  donut: "1568148847348-1c03e5cc84d9",
  coffee: "1760175445000-0e01e193d1cd",
  board: "1553709224-cc47858f104d",
  window: "1773780413018-5cefe827c029",
} as const;

type Product = { name: string; desc: string; price: string; img: string; alt: string };

const PRODUCTS: Product[] = [
  {
    name: "Croissant de manteiga",
    desc: "Folhado, assado de hora em hora.",
    price: "R$ 9,50",
    img: PHOTOS.croissant,
    alt: "Croissant dourado sobre um prato",
  },
  {
    name: "Pão de fermentação natural",
    desc: "Casca crocante, 36h de fermentação.",
    price: "R$ 24,00",
    img: PHOTOS.sourdough,
    alt: "Pão de fermentação natural com corte em folha",
  },
  {
    name: "Rosquinha glaceada",
    desc: "Massa fofa com cobertura de açúcar.",
    price: "R$ 7,00",
    img: PHOTOS.donut,
    alt: "Rosquinhas com cobertura",
  },
  {
    name: "Café com leite",
    desc: "Grão mineiro, leite vaporizado.",
    price: "R$ 8,00",
    img: PHOTOS.coffee,
    alt: "Xícara de café com desenho de latte art",
  },
  {
    name: "Tábua de pães e queijos",
    desc: "Para dividir no café da tarde.",
    price: "R$ 42,00",
    img: PHOTOS.board,
    alt: "Tábua com pães e queijos variados",
  },
];

function PhoneMenu() {
  return (
    <div className="lp-phone" aria-hidden="true">
      <div className="lp-phone__screen">
        <div className="lp-phone__header">
          <img src={photo(PHOTOS.window, 600)} alt="" />
          <div>
            <strong>Padaria Trigal</strong>
            <span>Aberto · entrega em 30 min</span>
          </div>
        </div>
        <ul className="lp-phone__list">
          {PRODUCTS.slice(0, 4).map((p) => (
            <li key={p.name}>
              <img src={photo(p.img, 160)} alt="" loading="lazy" />
              <div>
                <b>{p.name}</b>
                <small>{p.desc}</small>
                <em>{p.price}</em>
              </div>
              <span className="lp-phone__add">+</span>
            </li>
          ))}
        </ul>
        <div className="lp-phone__bar">
          <span>Enviar pedido</span>
          <span>R$ 27,00</span>
        </div>
      </div>
    </div>
  );
}

function Ticket() {
  return (
    <div className="lp-ticket" aria-hidden="true">
      <p className="lp-ticket__head">Pedido #128</p>
      <p>2× Croissant de manteiga</p>
      <p>1× Café com leite</p>
      <p className="lp-ticket__note">sem açúcar, por favor!</p>
      <p className="lp-ticket__total">Total R$ 27,00</p>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <Link to="/" className="lp-brand">
          <span className="lp-brand__mark" aria-hidden="true" />
          Comandaí
        </Link>
        <nav className="lp-nav__links">
          <Link to="/r/pizzaria-do-ze">Ver exemplo</Link>
          <Link to="/login" className="lp-btn lp-btn--small">
            Entrar
          </Link>
        </nav>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero__copy">
            <h1>O cardápio na mão do cliente. A comanda na sua.</h1>
            <p>
              Monte seu cardápio com fotos, compartilhe um link e receba cada pedido pronto para separar: a mensagem
              chega no seu WhatsApp e o pedido aparece no painel da cozinha.
            </p>
            <div className="lp-hero__cta">
              <Link to="/cadastro" className="lp-btn lp-btn--primary">
                Criar meu cardápio grátis
              </Link>
              <Link to="/r/pizzaria-do-ze" className="lp-btn">
                Ver um cardápio de exemplo
              </Link>
            </div>
            <p className="lp-hero__fine">Sem mensalidade e sem cartão. Leva uns 10 minutos.</p>
          </div>

          <div className="lp-hero__stage">
            <Ticket />
            <PhoneMenu />
          </div>
        </section>

        <section className="lp-steps" aria-labelledby="lp-steps-title">
          <h2 id="lp-steps-title">Do pedido à cozinha em três passos</h2>
          <ol>
            <li>
              <span className="lp-steps__n">1</span>
              <h3>O cliente monta o pedido</h3>
              <p>Abre o link da sua loja, escolhe os produtos pelas fotos e informa entrega ou retirada.</p>
            </li>
            <li>
              <span className="lp-steps__n">2</span>
              <h3>A mensagem chega no seu WhatsApp</h3>
              <p>Itens, observações, endereço e total já formatados. Você só confirma com o cliente.</p>
            </li>
            <li>
              <span className="lp-steps__n">3</span>
              <h3>O pedido cai no painel</h3>
              <p>Aparece na hora, com aviso sonoro. A cozinha arrasta de “novo” para “saiu para entrega”.</p>
            </li>
          </ol>
        </section>

        <section className="lp-show" aria-labelledby="lp-show-title">
          <div className="lp-show__intro">
            <h2 id="lp-show-title">Foto boa vende mais</h2>
            <p>
              É assim que fica o cardápio da Padaria Trigal, uma loja de exemplo. Cada produto tem foto, descrição e
              preço, e você pausa o que acabou com um toque.
            </p>
            <figure className="lp-show__hero">
              <img src={photo(PHOTOS.window, 1100)} alt="Vitrine de padaria com pães expostos" loading="lazy" />
            </figure>
          </div>
          <ul className="lp-show__grid">
            {PRODUCTS.map((p) => (
              <li key={p.name} className="lp-product">
                <img src={photo(p.img, 520)} alt={p.alt} loading="lazy" />
                <div className="lp-product__body">
                  <h3>{p.name}</h3>
                  <p>{p.desc}</p>
                  <span className="lp-product__price">{p.price}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-panel" aria-labelledby="lp-panel-title">
          <div>
            <h2 id="lp-panel-title">E no fim do dia, os números</h2>
            <p>
              O dashboard mostra faturamento, ticket médio, horários de pico e os produtos que mais saem. Dá para
              saber quantos croissants assar amanhã.
            </p>
          </div>
          <dl className="lp-panel__stats">
            <div>
              <dt>Pedidos hoje</dt>
              <dd>47</dd>
            </div>
            <div>
              <dt>Ticket médio</dt>
              <dd>R$ 31,40</dd>
            </div>
            <div>
              <dt>Mais vendido</dt>
              <dd>Croissant</dd>
            </div>
          </dl>
        </section>

        <section className="lp-cta">
          <h2>Sua loja no ar ainda hoje</h2>
          <p>Cadastre os produtos, coloque o link na bio e comece a receber pedidos.</p>
          <Link to="/cadastro" className="lp-btn lp-btn--paper">
            Criar meu cardápio grátis
          </Link>
        </section>
      </main>

      <footer className="lp-footer">
        <span>Comandaí, projeto de portfólio feito com Cloudflare Workers, D1 e React.</span>
        <span>
          Fotos:{" "}
          <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">
            Unsplash
          </a>
          . Padaria Trigal e seus produtos são fictícios.
        </span>
      </footer>
    </div>
  );
}
