import type { ReactNode } from 'react';

// 149: the taste test showed twenty stock photos, each with its own light and framing. The owner chose flat
// illustrations drawn in the app: one food per question on its own soft colour, all in the same hand. They are
// decoration (the question names the food), so they are hidden from VoiceOver.
type Art = { bg: string; draw: ReactNode };
const leaf = (x: number, y: number, r: number, fill = '#4d8b3f') => <path d={`M${x} ${y}c14-16 34-14 42 0c-8 14-28 16-42 0z`} fill={fill} transform={`rotate(${r} ${x} ${y})`} />;
const ART: Record<number, Art> = {
  // manzana verde
  1: { bg: '#e8f3d8', draw: <><path d="M100 70c-34-18-62 6-58 44c4 34 28 52 58 40c30 12 54-6 58-40c4-38-24-62-58-44z" fill="#8cc152" /><path d="M72 92c-10 8-12 24-8 36" stroke="#c5e59a" strokeWidth="8" strokeLinecap="round" fill="none" /><path d="M100 72c0-12 4-22 12-30" stroke="#6b4a2b" strokeWidth="6" strokeLinecap="round" fill="none" />{leaf(110, 52, -20)}</> },
  // cayena
  2: { bg: '#fde3dc', draw: <><path d="M52 150c40 6 86-30 96-84c-10-8-22-8-30 0c-6 40-30 66-70 70c-6 6-4 12 4 14z" fill="#d7372f" /><path d="M118 66c6-14 18-22 32-22" stroke="#4d8b3f" strokeWidth="9" strokeLinecap="round" fill="none" /><path d="M70 138c26-6 44-24 54-50" stroke="#f08a80" strokeWidth="6" strokeLinecap="round" fill="none" /></> },
  // trufas
  3: { bg: '#efe6dc', draw: <><circle cx="82" cy="112" r="40" fill="#4a3628" /><circle cx="132" cy="124" r="28" fill="#5c4433" />{[[66, 96], [90, 84], [98, 118], [72, 128], [126, 114], [142, 132]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#33241a" />)}<path d="M112 150a30 12 0 0 0 44 0" fill="#d9c7b3" /></> },
  // pimiento rojo asado
  4: { bg: '#fde8dc', draw: <><path d="M100 62c-30-10-52 14-50 46c2 30 14 48 28 50c10 2 14-6 22-6s12 8 22 6c14-2 26-20 28-50c2-32-20-56-50-46z" fill="#d7372f" /><path d="M100 62c-2-10 2-20 10-26" stroke="#4d8b3f" strokeWidth="10" strokeLinecap="round" fill="none" /><path d="M70 84c-6 16-4 38 4 54M100 78v70" stroke="#a82822" strokeWidth="5" strokeLinecap="round" fill="none" /></> },
  // cuero
  5: { bg: '#f1e4d3', draw: <><rect x="34" y="78" width="132" height="52" rx="12" fill="#8a5a33" /><rect x="34" y="78" width="132" height="52" rx="12" fill="none" stroke="#6b4324" strokeWidth="4" strokeDasharray="8 7" /><rect x="118" y="68" width="40" height="72" rx="8" fill="none" stroke="#c9a45c" strokeWidth="9" /><rect x="134" y="98" width="20" height="10" rx="5" fill="#c9a45c" />{[54, 72, 90].map(x => <circle key={x} cx={x} cy="104" r="4" fill="#4d2f18" />)}</> },
  // queso azul
  6: { bg: '#e3ecf5', draw: <><path d="M36 138l120-70l12 70z" fill="#f4e7b5" /><path d="M36 138l120-70l-8-6z" fill="#e6d48f" />{[[84, 122, 8], [116, 106, 6], [134, 126, 9], [104, 130, 5], [148, 98, 5], [66, 130, 5]].map(([x, y, r]) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={r} ry={r * 0.6} fill="#5b84b1" transform={`rotate(-25 ${x} ${y})`} />)}</> },
  // pepinillos
  7: { bg: '#e6f1dc', draw: <><rect x="60" y="56" width="80" height="104" rx="16" fill="#cfe6e0" stroke="#9fc4bb" strokeWidth="4" /><rect x="66" y="42" width="68" height="18" rx="6" fill="#c9a45c" />{[[84, 108, -8], [104, 112, 6], [120, 104, -4]].map(([x, y, r]) => <rect key={x} x={x - 9} y={y - 34} width="18" height="68" rx="9" fill="#6fa03c" transform={`rotate(${r} ${x} ${y})`} />)}{[[84, 96], [104, 120], [120, 92], [84, 124]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#4d7a25" />)}</> },
  // berenjenas asadas
  8: { bg: '#ece3f3', draw: <><path d="M118 62c26 8 40 38 30 66c-8 24-34 36-58 28c-26-8-34-34-22-56c8-16 22-22 34-34z" fill="#5b3a82" /><path d="M118 62c-12-2-22 4-28 14c10 2 22 0 32-6c6 6 14 8 22 6c-4-10-14-16-26-14z" fill="#4d8b3f" /><path d="M116 60c-2-10 2-18 8-24" stroke="#3d6f32" strokeWidth="8" strokeLinecap="round" fill="none" /><path d="M86 108c-4 14 2 28 14 34" stroke="#8a66b5" strokeWidth="7" strokeLinecap="round" fill="none" /></> },
  // dátiles
  9: { bg: '#f6e6d2', draw: <>{[[78, 104, -24], [116, 96, 14], [104, 136, -6]].map(([x, y, r]) => <g key={x} transform={`rotate(${r} ${x} ${y})`}><ellipse cx={x} cy={y} rx="34" ry="20" fill="#7a4a24" /><path d={`M${x - 20} ${y - 6}c12-6 28-6 40 0`} stroke="#a36a3a" strokeWidth="5" strokeLinecap="round" fill="none" /><circle cx={x + 32} cy={y} r="4" fill="#c9a45c" /></g>)}</> },
  // anís estrellado
  10: { bg: '#f3e7d6', draw: <>{[0, 45, 90, 135, 180, 225, 270, 315].map(angle => <g key={angle} transform={`rotate(${angle} 100 100)`}><path d="M100 100c-12-20-10-44 0-58c10 14 12 38 0 58z" fill="#8a5a33" /><ellipse cx="100" cy="62" rx="4" ry="8" fill="#d9a65c" /></g>)}<circle cx="100" cy="100" r="9" fill="#5c3b1f" /></> },
  // café solo
  11: { bg: '#ece2d8', draw: <><ellipse cx="96" cy="150" rx="62" ry="10" fill="#d6c4b0" /><path d="M48 84h96v24c0 28-20 44-48 44s-48-16-48-44z" fill="#fff" stroke="#cdbba6" strokeWidth="4" /><ellipse cx="96" cy="86" rx="46" ry="10" fill="#3b2416" /><path d="M144 94c22-4 26 30 0 30" stroke="#cdbba6" strokeWidth="8" fill="none" /><path d="M82 62c-6-8 6-12 0-22M106 62c-6-8 6-12 0-22" stroke="#b9a48e" strokeWidth="5" strokeLinecap="round" fill="none" /></> },
  // avellanas tostadas
  12: { bg: '#f4e8d6', draw: <>{[[78, 110], [124, 100], [104, 142]].map(([x, y]) => <g key={x}><path d={`M${x - 26} ${y}c0-30 52-30 52 0c0 26-18 34-26 34s-26-8-26-34z`} fill="#b5763a" /><path d={`M${x - 26} ${y - 4}c2-26 50-26 52 0c-14 8-38 8-52 0z`} fill="#e3c08a" /><path d={`M${x - 8} ${y + 8}c-2 8 0 14 4 18`} stroke="#d99a5b" strokeWidth="5" strokeLinecap="round" fill="none" /></g>)}</> },
  // vainilla
  13: { bg: '#f7efd9', draw: <><path d="M44 150c30-30 70-70 104-108" stroke="#3b2416" strokeWidth="10" strokeLinecap="round" fill="none" /><path d="M58 160c34-26 76-62 108-96" stroke="#5c3b1f" strokeWidth="9" strokeLinecap="round" fill="none" />{[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cx="70" cy="48" rx="11" ry="20" fill="#fff8dc" stroke="#ead9a0" strokeWidth="2" transform={`rotate(${angle} 70 72)`} />)}<circle cx="70" cy="72" r="8" fill="#f2c94c" /></> },
  // café con leche y azúcar
  14: { bg: '#f3e6d8', draw: <><path d="M62 52h76l-8 104a8 8 0 0 1-8 8H78a8 8 0 0 1-8-8z" fill="#fff" stroke="#d9c7b3" strokeWidth="4" /><path d="M66 84h68l-6 70a6 6 0 0 1-6 6H78a6 6 0 0 1-6-6z" fill="#c69a6d" /><path d="M65 72h70l-1 14H66z" fill="#f7ecdf" /><rect x="144" y="124" width="22" height="22" rx="4" fill="#fff" stroke="#d9c7b3" strokeWidth="3" transform="rotate(12 155 135)" /><rect x="150" y="150" width="18" height="18" rx="4" fill="#fff" stroke="#d9c7b3" strokeWidth="3" transform="rotate(-10 159 159)" /></> },
  // hierbabuena
  15: { bg: '#def2e3', draw: <><path d="M100 168V92" stroke="#3d6f32" strokeWidth="6" strokeLinecap="round" />{[[100, 96, -90, 34], [100, 118, -150, 30], [100, 118, -30, 30], [100, 144, -160, 26], [100, 144, -20, 26]].map(([x, y, r, s]) => <g key={`${y}-${r}`} transform={`rotate(${r} ${x} ${y})`}><path d={`M${x} ${y}c${s * 0.5}-${s * 0.6} ${s * 1.3}-${s * 0.6} ${s * 1.8} 0c-${s * 0.5} ${s * 0.6}-${s * 1.3} ${s * 0.6}-${s * 1.8} 0z`} fill="#4fa55c" /><path d={`M${x + 4} ${y}h${s * 1.5}`} stroke="#2f7a3d" strokeWidth="3" strokeLinecap="round" /></g>)}</> },
  // mango
  16: { bg: '#fdeecb', draw: <><g transform="rotate(-28 100 108)"><ellipse cx="100" cy="108" rx="62" ry="42" fill="#f6b02c" /><path d="M40 100c6-22 30-36 60-36c20 0 38 8 50 20c-22-6-44-2-62 8c-16 8-32 12-48 8z" fill="#e2552d" opacity=".7" /><path d="M120 138c16-2 28-10 36-22" stroke="#9cbf3b" strokeWidth="9" strokeLinecap="round" fill="none" opacity=".8" /></g><path d="M52 78c-6-8-6-18 0-26" stroke="#6b4a2b" strokeWidth="6" strokeLinecap="round" fill="none" />{leaf(54, 56, -60)}</> },
  // marisco (gamba)
  17: { bg: '#fde5df', draw: <><path d="M150 82c-10-30-52-40-80-18c-28 22-26 62 4 78c10 6 22 6 30 2c-22-6-34-22-30-42c4-20 26-30 46-22c12 4 20 14 22 26c8-6 12-14 8-24z" fill="#f2836b" /><path d="M72 142l-22 18l28-4zM62 132l-24 6l22 6z" fill="#e2664d" /><path d="M96 66c4 12 4 24 0 36M118 66c6 12 6 22 2 34M76 78c2 10 2 20-2 30" stroke="#e2664d" strokeWidth="4" strokeLinecap="round" fill="none" /><circle cx="140" cy="84" r="4" fill="#2b2b2b" /><path d="M148 76c12-10 22-14 30-12M150 86c12-2 22 0 28 6" stroke="#e2664d" strokeWidth="3" strokeLinecap="round" fill="none" /></> },
  // encurtidos (aceitunas y cebollitas)
  18: { bg: '#e9efd6', draw: <><path d="M46 104h108c0 34-22 54-54 54s-54-20-54-54z" fill="#fff" stroke="#cfd8b0" strokeWidth="4" />{[[76, 98, '#6b7f2a'], [104, 92, '#8a9a3a'], [130, 100, '#6b7f2a']].map(([x, y, fill]) => <g key={x as number}><ellipse cx={x as number} cy={y as number} rx="17" ry="14" fill={fill as string} /><circle cx={(x as number) + 6} cy={(y as number) - 2} r="4.5" fill="#d7372f" /></g>)}<circle cx="90" cy="112" r="11" fill="#f4efe1" stroke="#ddd3b8" strokeWidth="3" /><circle cx="118" cy="114" r="10" fill="#f4efe1" stroke="#ddd3b8" strokeWidth="3" /></> },
  // curry
  19: { bg: '#fdeccb', draw: <><ellipse cx="100" cy="156" rx="60" ry="9" fill="#ecd9aa" /><path d="M40 98h120c0 36-24 58-60 58s-60-22-60-58z" fill="#fff" stroke="#e3d2a4" strokeWidth="4" /><ellipse cx="100" cy="100" rx="54" ry="12" fill="#e9a21f" />{[[82, 98], [104, 104], [122, 96]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5" fill="#c9781a" />)}{leaf(92, 92, -30, '#4fa55c')}<path d="M84 70c-6-8 6-12 0-22M112 70c-6-8 6-12 0-22" stroke="#e3c98a" strokeWidth="5" strokeLinecap="round" fill="none" /></> },
  // caramelos de limón
  20: { bg: '#fbf3c4', draw: <>{[[84, 92, -18], [120, 132, 14]].map(([x, y, r]) => <g key={x} transform={`rotate(${r} ${x} ${y})`}><path d={`M${x - 30} ${y}l-24-16v32zM${x + 30} ${y}l24-16v32z`} fill="#f7e06a" stroke="#e3c53a" strokeWidth="3" strokeLinejoin="round" /><ellipse cx={x} cy={y} rx="32" ry="22" fill="#f6d32d" /><path d={`M${x - 16} ${y - 8}c10-6 22-6 32 0`} stroke="#fff3a6" strokeWidth="5" strokeLinecap="round" fill="none" /></g>)}</> },
};

export const QuizArt149 = ({ id, className = '' }: { id: number; className?: string }) => {
  const art = ART[id]; if (!art) return null;
  return <svg viewBox="0 0 200 200" role="presentation" aria-hidden="true" focusable="false" className={className} style={{ backgroundColor: art.bg }} data-testid="quiz-art149">{art.draw}</svg>;
};
export const QUIZ_ART_IDS149 = Object.keys(ART).map(Number);
