import { useRef } from "react";
const policy =
  "default-src 'none';script-src 'unsafe-inline';style-src 'unsafe-inline';img-src data:;connect-src 'none';form-action 'none';base-uri 'none'";
const listener =
  "<script>addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='frame'&&Number.isFinite(e.data.time))window.film?.frame?.(e.data.time)})</script>";
function htmlDocument(html: string) {
  return `<meta http-equiv="Content-Security-Policy" content="${policy}">${html}${listener}`;
}
export default function HtmlPreview({ html }: { html: string }) {
  const { frame, onChange } = useFrame();
  return (
    <div className="nodrag nowheel">
      <iframe ref={frame} {...frameProps} srcDoc={htmlDocument(html)} />
      <input {...sliderProps} onChange={onChange} />
    </div>
  );
}
const frameProps = { sandbox: "allow-scripts", title: "HTML 预览" };
const sliderProps = {
  type: "range",
  "aria-label": "画面时间",
  min: "0",
  max: "6",
  step: ".1",
  defaultValue: "0",
};
function seek(frame: HTMLIFrameElement | null, time: number) {
  frame?.contentWindow?.postMessage({ type: "frame", time }, "*");
}

function useFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    seek(frame.current, Number(e.target.value));
  return { frame, onChange };
}
