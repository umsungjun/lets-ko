interface JsonLdProps {
  /** 단일 노드 또는 @graph로 묶을 노드 배열 */
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * @description Schema.org JSON-LD를 script 태그로 출력. 노드가 여러 개면 @graph 하나로 묶어 스크립트 수를 늘리지 않는다.
 * @param props.data - JSON-LD 노드 또는 노드 배열
 */
export default function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data }
    : data;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
