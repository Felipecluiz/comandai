import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  { name: "Croissant de manteiga", desc: "Folhado, assado de hora em hora.", price: "9,50", img: PHOTOS.croissant, alt: "Croissant dourado sobre um prato" },
  { name: "Pão de fermentação natural", desc: "Casca crocante, 36h de fermentação.", price: "24,00", img: PHOTOS.sourdough, alt: "Pão de fermentação natural com corte em folha" },
  { name: "Café com leite", desc: "Grão mineiro, leite vaporizado.", price: "8,00", img: PHOTOS.coffee, alt: "Xícara de café com desenho de latte art" },
  { name: "Tábua de pães e queijos", desc: "Para dividir no café da tarde.", price: "42,00", img: PHOTOS.board, alt: "Tábua com pães e queijos variados" },
  { name: "Rosquinha glaceada", desc: "Massa fofa com cobertura de açúcar.", price: "7,00", img: PHOTOS.donut, alt: "Rosquinhas com cobertura" },
];

const STEPS = [
  { title: "O cliente monta o pedido", text: "Abre o link da sua loja, escolhe pelas fotos, diz se é entrega ou retirada e como vai pagar: Pix, cartão ou dinheiro com troco." },
  { title: "A mensagem chega no seu WhatsApp", text: "Itens, observações, endereço e total já vêm escritos. Você só confirma com o cliente, na conversa que já usa." },
  { title: "O pedido cai no painel da cozinha", text: "Aparece na hora, com um aviso sonoro. A equipe move de “novo” para “em preparo” e depois para “saiu para entrega”." },
];

const STATEMENT = "Nenhum pedido perdido no meio das conversas. Cada um chega completo, com total e endereço, e entra na fila da cozinha.";

type BoardColumn = { col: string; cards: Array<{ n: string; t: string; fresh?: boolean }> };
const BOARD: BoardColumn[] = [
  { col: "Novo", cards: [{ n: "#128", t: "Marina · R$ 27,00", fresh: true }] },
  { col: "Em preparo", cards: [{ n: "#127", t: "Rafael · R$ 42,00" }, { n: "#126", t: "Bia · R$ 9,50" }] },
  { col: "Pronto", cards: [{ n: "#125", t: "Caio · R$ 31,40" }] },
];

const HOURS = [
  { h: "6h", v: 4 }, { h: "7h", v: 9 }, { h: "8h", v: 14 }, { h: "9h", v: 7 }, { h: "10h", v: 3 }, { h: "11h", v: 2 },
  { h: "12h", v: 3 }, { h: "13h", v: 2 }, { h: "14h", v: 2 }, { h: "15h", v: 4 }, { h: "16h", v: 6 }, { h: "17h", v: 8 }, { h: "18h", v: 5 },
];
const PEAK = Math.max(...HOURS.map((x) => x.v));

const FAQ = [
  { q: "Quanto custa?", a: "Nada. Não tem mensalidade nem taxa por pedido, e você não precisa cadastrar cartão." },
  { q: "O cliente precisa baixar algum aplicativo?", a: "Não. O cardápio abre no navegador do celular a partir do seu link, e o pedido é enviado pelo WhatsApp que ele já tem." },
  { q: "Como eu recebo o pagamento?", a: "Na entrega ou na retirada, do jeito que você já faz. O cliente informa no pedido se vai pagar com Pix, cartão ou dinheiro, e se precisa de troco." },
  { q: "Funciona com o WhatsApp comum ou só com o Business?", a: "Com os dois. O pedido chega como uma mensagem normal no número que você cadastrou." },
];

function PhoneMenu() {
  return (
    <div className="lp-phone" aria-hidden="true">
      <div className="lp-phone__screen">
        <div className="lp-phone__header">
          <img src={photo(PHOTOS.window, 600)} alt="" />
          <div>
            <strong>Padaria Trigal</strong>
            <span>Aberto até 20h · entrega em 30 min</span>
          </div>
        </div>
        <ul className="lp-phone__list">
          {PRODUCTS.slice(0, 4).map((p) => (
            <li key={p.name}>
              <img src={photo(p.img, 160)} alt="" loading="lazy" />
              <div>
                <b>{p.name}</b>
                <small>{p.desc}</small>
                <em>R$ {p.price}</em>
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

/** Frase que vai "acendendo" palavra por palavra conforme a rolagem (CSS scroll-driven, com fallback estático). */
function Statement() {
  return (
    <section className="lp-statement" aria-label={STATEMENT}>
      <p aria-hidden="true">
        {STATEMENT.split(" ").map((word, i) => (
          <span key={i} style={{ "--i": i } as CSSProperties}>
            {word}{" "}
          </span>
        ))}
      </p>
    </section>
  );
}

/** Ilustrações do painel fixo do "como funciona", uma por passo. */
function StepVisual({ step }: { step: number }) {
  return (
    <div className="lp-stage__visual" aria-hidden="true">
      <div className={`lp-stage__frame${step === 0 ? " is-on" : ""}`}>
        <div className="lp-mini-menu">
          {PRODUCTS.slice(0, 3).map((p, i) => (
            <div key={p.name} className="lp-mini-menu__row">
              <img src={photo(p.img, 160)} alt="" loading="lazy" />
              <div>
                <b>{p.name}</b>
                <em>R$ {p.price}</em>
              </div>
              <span className={i < 2 ? "is-picked" : undefined}>{i === 0 ? "2" : i === 2 ? "+" : "1"}</span>
            </div>
          ))}
          <div className="lp-mini-menu__pay">
            <span className="is-on">Pix</span>
            <span>Cartão</span>
            <span>Dinheiro</span>
          </div>
        </div>
      </div>

      <div className={`lp-stage__frame${step === 1 ? " is-on" : ""}`}>
        <div className="lp-chat">
          <div className="lp-chat__head">
            <span className="lp-chat__avatar">M</span>
            <div>
              <b>Marina</b>
              <small>online</small>
            </div>
          </div>
          <div className="lp-chat__bubble">
            <b>Novo pedido · Padaria Trigal</b>
            <br />2× Croissant de manteiga — R$ 19,00
            <br />1× Café com leite — R$ 8,00
            <br />Obs.: sem açúcar, por favor!
            <br />
            <br />Entrega: Rua das Flores, 120
            <br />Pagamento: Pix
            <br />
            <b>Total: R$ 27,00</b>
            <time>8:14</time>
          </div>
        </div>
      </div>

      <div className={`lp-stage__frame${step === 2 ? " is-on" : ""}`}>
        <div className="lp-board">
          {BOARD.map((c) => (
            <div key={c.col} className="lp-board__col">
              <span className="lp-board__title">{c.col}</span>
              {c.cards.map((card) => (
                <div key={card.n} className={`lp-board__card${card.fresh ? " is-fresh" : ""}`}>
                  <b>{card.n}</b>
                  <small>{card.t}</small>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="lp-how" id="como-funciona" aria-labelledby="lp-how-title">
      <div className="lp-how__stage">
        <div className="lp-stage__progress" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.title} className={i <= active ? "is-on" : undefined} />
          ))}
        </div>
        <StepVisual step={active} />
      </div>

      <div className="lp-how__text">
        <h2 id="lp-how-title">Do celular do cliente à cozinha</h2>
        <ol className="lp-timeline">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              data-step={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={i === active ? "is-active" : undefined}
            >
              <span className="lp-timeline__dot" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="lp">
      <a className="lp-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="lp-nav">
        <div className="lp-nav__inner">
          <Link to="/" className="lp-brand">
            <span className="lp-brand__mark" aria-hidden="true" />
            Comandaí
          </Link>
          <nav className="lp-nav__links" aria-label="Seções">
            <a href="#como-funciona">Como funciona</a>
            <a href="#exemplo">Cardápio</a>
            <a href="#painel">Painel</a>
            <a href="#perguntas">Perguntas</a>
          </nav>
          <div className="lp-nav__actions">
            <Link to="/login" className="lp-nav__login">
              Entrar
            </Link>
            <Link to="/cadastro" className="lp-btn lp-btn--primary lp-btn--small">
              Criar cardápio
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section className="lp-hero">
          <div className="lp-hero__copy">
            <h1>
              O cardápio na mão do cliente.
              <br />A comanda na sua.
            </h1>
            <p className="lp-hero__lead">
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
            <div className="lp-chip lp-chip--order" aria-hidden="true">
              <span className="lp-chip__dot" />
              <div>
                <b>Novo pedido #128</b>
                <small>Marina · agora há pouco</small>
              </div>
            </div>
            <div className="lp-chip lp-chip--zap" aria-hidden="true">
              <b>Enviado pelo WhatsApp</b>
              <small>R$ 27,00 · Pix</small>
            </div>
          </div>
        </section>

        <Statement />

        <HowItWorks />

        <section className="lp-show" id="exemplo" aria-labelledby="lp-show-title">
          <div className="lp-show__head">
            <div>
              <h2 id="lp-show-title">Foto boa vende mais</h2>
              <p>
                Este é o cardápio da Padaria Trigal, uma loja de exemplo. Cada produto tem foto, descrição e preço, e
                você pausa o que acabou com um toque.
              </p>
            </div>
            <Link to="/r/pizzaria-do-ze" className="lp-btn">
              Ver o cardápio da Pizzaria do Zé
            </Link>
          </div>
          <ul className="lp-mosaic">
            <li className="lp-mosaic__feature">
              <img src={photo(PHOTOS.window, 1100)} alt="Vitrine de padaria com pães expostos" loading="lazy" />
              <div className="lp-mosaic__caption">
                <b>Padaria Trigal</b>
                <span>Aberto até 20h · entrega em 30 min</span>
              </div>
            </li>
            {PRODUCTS.slice(0, 4).map((p) => (
              <li key={p.name} className="lp-product">
                <img src={photo(p.img, 520)} alt={p.alt} loading="lazy" />
                <div className="lp-product__body">
                  <h3>{p.name}</h3>
                  <p>{p.desc}</p>
                  <span className="lp-product__price">
                    <small>R$</small> {p.price}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-panel" id="painel" aria-labelledby="lp-panel-title">
          <div className="lp-panel__copy">
            <h2 id="lp-panel-title">No fim do dia, os números</h2>
            <p>
              O painel mostra faturamento, ticket médio, horários de pico e os produtos que mais saem. Dá para saber
              quantos croissants assar amanhã.
            </p>
          </div>

          <figure className="lp-dash" aria-label="Exemplo do painel da Padaria Trigal">
            <figcaption className="lp-dash__head">
              <b>Padaria Trigal</b>
              <span>Hoje, até as 18h</span>
            </figcaption>
            <dl className="lp-dash__stats">
              <div>
                <dt>Pedidos</dt>
                <dd>69</dd>
                <span className="lp-delta">+12% que ontem</span>
              </div>
              <div>
                <dt>Ticket médio</dt>
                <dd>
                  <small>R$</small>31,40
                </dd>
                <span className="lp-delta">+R$ 2,10</span>
              </div>
              <div>
                <dt>Faturamento</dt>
                <dd>
                  <small>R$</small>2.167
                </dd>
                <span className="lp-delta lp-delta--muted">meta R$ 2.000</span>
              </div>
            </dl>
            <div className="lp-dash__chart">
              <div className="lp-dash__chart-head">
                <span>Pedidos por hora</span>
                <span className="lp-dash__peak">Pico às 8h</span>
              </div>
              <div className="lp-bars" role="img" aria-label="Pedidos por hora: pico de 14 pedidos às 8h">
                {HOURS.map((x) => (
                  <div key={x.h} className={`lp-bars__col${x.v === PEAK ? " is-peak" : ""}`}>
                    <span style={{ height: `${(x.v / PEAK) * 100}%` }} />
                    <small>{x.h}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="lp-dash__top">
              <span>Mais vendido</span>
              <b>Croissant de manteiga</b>
              <span className="lp-dash__count">58 un.</span>
            </div>
          </figure>
        </section>

        <section className="lp-faq" id="perguntas" aria-labelledby="lp-faq-title">
          <h2 id="lp-faq-title">Perguntas frequentes</h2>
          <div className="lp-faq__list">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp-cta">
          <h2>Sua loja no ar ainda hoje</h2>
          <p>Cadastre os produtos, coloque o link na bio e comece a receber pedidos.</p>
          <div className="lp-cta__actions">
            <Link to="/cadastro" className="lp-btn lp-btn--paper">
              Criar meu cardápio grátis
            </Link>
            <Link to="/r/pizzaria-do-ze" className="lp-btn lp-btn--ghost">
              Ver um cardápio de exemplo
            </Link>
          </div>
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
