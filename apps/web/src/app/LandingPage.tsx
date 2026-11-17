import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
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

/**
 * Parallax leve: cada elemento com data-parallax="velocidade" recebe --p (px) conforme a distância
 * do seu bloco-pai até o centro da tela. Mede o pai (que não se move) para não haver "tremida".
 * Fica desligado para quem pediu menos movimento no sistema.
 */
function useParallax(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = Array.from(
      el.querySelectorAll<HTMLElement>("[data-parallax], [data-parallax-bg]"),
    );
    if (items.length === 0) return;
    el.classList.add("is-parallax");

    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      // Em telas pequenas o efeito fica mais contido, para nada sobrepor o texto.
      const scale = window.innerWidth < 640 ? 0.4 : window.innerWidth < 960 ? 0.7 : 1;
      for (const item of items) {
        const speed = scale * Number(item.dataset.parallax ?? item.dataset.parallaxBg ?? 0);
        const anchor = item.dataset.parallaxBg !== undefined ? item : (item.parentElement ?? item);
        const rect = anchor.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > window.innerHeight + 200) continue;
        const offset = rect.top + rect.height / 2 - mid;
        // data-parallax-max limita o deslocamento (px), para nada invadir a seção vizinha.
        const max = Number(item.dataset.parallaxMax ?? Infinity);
        const value = Math.max(-max, Math.min(max, -offset * speed));
        item.style.setProperty("--p", value.toFixed(1));
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      el.classList.remove("is-parallax");
    };
  }, [root]);
}

/** true quando o elemento entra na tela (uma vez só). Sem IntersectionObserver, já começa visível. */
function useInView(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

const numberFormat = (decimals: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Número que conta de 0 até o valor final quando `run` vira true. */
function CountUp({ to, decimals = 0, run }: { to: number; decimals?: number; run: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const duration = reduce ? 0 : 1200;
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      setValue(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, to]);
  return <>{numberFormat(decimals).format(value)}</>;
}

function PhoneMenu() {
  return (
    <div className="lp-phone" aria-hidden="true" data-parallax="-0.06">
      <span className="lp-phone__btn lp-phone__btn--action" />
      <span className="lp-phone__btn lp-phone__btn--vol-up" />
      <span className="lp-phone__btn lp-phone__btn--vol-down" />
      <span className="lp-phone__btn lp-phone__btn--power" />
      <div className="lp-phone__screen">
        <div className="lp-phone__status">
          <span>9:41</span>
          <span className="lp-phone__island" />
          <svg viewBox="0 0 64 12" width="58" height="11">
            <g fill="currentColor">
              <rect x="0" y="8" width="3" height="4" rx="0.8" />
              <rect x="4.5" y="6" width="3" height="6" rx="0.8" />
              <rect x="9" y="3.5" width="3" height="8.5" rx="0.8" />
              <rect x="13.5" y="1" width="3" height="11" rx="0.8" />
              <path d="M29 3.2a9.6 9.6 0 0 1 6.7 2.7l1.3-1.3A11.4 11.4 0 0 0 29 1.4a11.4 11.4 0 0 0-8 3.2l1.3 1.3A9.6 9.6 0 0 1 29 3.2Zm0 3.6a6 6 0 0 1 4.2 1.7l1.3-1.3A7.8 7.8 0 0 0 29 5a7.8 7.8 0 0 0-5.5 2.2l1.3 1.3A6 6 0 0 1 29 6.8Zm0 3.6c.6 0 1.1.2 1.6.6L29 12.6 27.4 11c.5-.4 1-.6 1.6-.6Z" />
              <rect x="42.5" y="1.5" width="18" height="9" rx="2.6" fill="none" stroke="currentColor" strokeOpacity="0.45" />
              <rect x="44.3" y="3.3" width="12.5" height="5.4" rx="1.4" />
              <path d="M62 4.5v3a1.6 1.6 0 0 0 0-3Z" fillOpacity="0.45" />
            </g>
          </svg>
        </div>
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
        <span className="lp-phone__home" />
      </div>
    </div>
  );
}

function Ticket() {
  return (
    <div className="lp-ticket" aria-hidden="true" data-parallax="0.14">
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
      <div className="lp-float" aria-hidden="true">
        <img className="lp-float__a" src={photo(PHOTOS.croissant, 360)} alt="" loading="lazy" data-parallax="0.12" data-parallax-max="40" />
        <img className="lp-float__b" src={photo(PHOTOS.coffee, 300)} alt="" loading="lazy" data-parallax="-0.08" data-parallax-max="30" />
        <img className="lp-float__c" src={photo(PHOTOS.donut, 260)} alt="" loading="lazy" data-parallax="0.16" data-parallax-max="45" />
        <span className="lp-float__tag" data-parallax="0.06" data-parallax-max="20">
          Pedido #129 · R$ 16,50
        </span>
      </div>
    </section>
  );
}

/** Ilustrações do painel fixo do "como funciona", uma por passo. */
function StepVisual({ step, only, className = "" }: { step: number; only?: number; className?: string }) {
  const show = (i: number) => only === undefined || only === i;
  const on = (i: number) => (only !== undefined || step === i ? " is-on" : "");
  return (
    <div className={`lp-stage__visual ${className}`} aria-hidden="true">
      {show(0) && (
      <div className={`lp-stage__frame${on(0)}`}>
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

      )}
      {show(1) && (
      <div className={`lp-stage__frame${on(1)}`}>
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

      )}
      {show(2) && (
      <div className={`lp-stage__frame${on(2)}`}>
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
      )}
    </div>
  );
}

function HowItWorks() {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    // Ativo = o último passo cujo topo já passou da metade da tela.
    const pick = () => {
      const line = window.innerHeight * 0.55;
      let current = 0;
      refs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top < line) current = i;
      });
      setActive(current);
    };
    const observer = new IntersectionObserver(pick, {
      threshold: [0, 0.25, 0.5, 0.75, 1],
      rootMargin: "-20% 0px -20% 0px",
    });
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="lp-how" id="como-funciona" aria-labelledby="lp-how-title">
      <div className="lp-how__stage">
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
              <StepVisual step={i} only={i} className="lp-step-inline" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useParallax(rootRef);
  const dashRef = useRef<HTMLElement>(null);
  const dashVisible = useInView(dashRef);

  return (
    <div className="lp" ref={rootRef}>
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
            <div className="lp-chip lp-chip--order" aria-hidden="true" data-parallax="0.22">
              <span className="lp-chip__dot" />
              <div>
                <b>Novo pedido #128</b>
                <small>Marina · agora há pouco</small>
              </div>
            </div>
            <div className="lp-chip lp-chip--zap" aria-hidden="true" data-parallax="-0.16">
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
              <img src={photo(PHOTOS.window, 1100)} alt="Vitrine de padaria com pães expostos" loading="lazy" data-parallax="0.12" />
              <div className="lp-mosaic__caption">
                <b>Padaria Trigal</b>
                <span>Aberto até 20h · entrega em 30 min</span>
              </div>
            </li>
            {PRODUCTS.slice(0, 4).map((p, i) => (
              <li key={p.name} className="lp-product" data-parallax={i % 2 === 0 ? "0.05" : "-0.05"}>
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

          <figure
            ref={dashRef}
            className={`lp-dash${dashVisible ? " is-visible" : ""}`}
            aria-label="Exemplo do painel da Padaria Trigal"
            data-parallax="-0.05"
          >
            <figcaption className="lp-dash__head">
              <b>Padaria Trigal</b>
              <span>Hoje, até as 18h</span>
            </figcaption>
            <dl className="lp-dash__stats">
              <div>
                <dt>Pedidos</dt>
                <dd>
                  <CountUp to={69} run={dashVisible} />
                </dd>
                <span className="lp-delta">+12% que ontem</span>
              </div>
              <div>
                <dt>Ticket médio</dt>
                <dd>
                  <small>R$</small>
                  <CountUp to={31.4} decimals={2} run={dashVisible} />
                </dd>
                <span className="lp-delta">+R$ 2,10</span>
              </div>
              <div>
                <dt>Faturamento</dt>
                <dd>
                  <small>R$</small>
                  <CountUp to={2167} run={dashVisible} />
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
                {HOURS.map((x, i) => (
                  <div key={x.h} className={`lp-bars__col${x.v === PEAK ? " is-peak" : ""}`}>
                    <span style={{ height: `${(x.v / PEAK) * 100}%`, "--i": i } as CSSProperties} />
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

        <section className="lp-cta" data-parallax-bg="0.25">
          <div className="lp-cta__deco" aria-hidden="true">
            <img src={photo(PHOTOS.sourdough, 420)} alt="" loading="lazy" data-parallax="0.08" />
            <div className="lp-cta__ticket" data-parallax="-0.1">
              <b>Pedido #130</b>
              <span>1× Pão de fermentação natural</span>
              <span>2× Café com leite</span>
              <em>Total R$ 40,00</em>
            </div>
          </div>
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
