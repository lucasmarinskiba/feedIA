---
description: Skill Creator — crear, modificar, optimizar y medir performance de skills
---

Skill Creator para FeedIA. Meta-skill: crea otras skills.

## Según $ARGUMENTS

**"new [name]"** → Skill nueva desde scratch. Wizard interactivo.

**"edit [name]"** → Modificar skill existente.

**"optimize [name]"** → Mejorar trigger accuracy y output quality.

**"benchmark [name]"** → Mide accuracy con eval cases + variance.

**"variance [name]"** → Misma entrada N veces → consistency score.

**"trigger-test [name] [phrases]"** → Test si frases activan la skill.

**"audit-all"** → Lista todas las skills + score quality + duplicates.

## Workflow nueva skill

```
1. Pedir: name + purpose + ejemplos uso
2. Generar description (< 200c) con triggers múltiples
3. Generar body con secciones:
   - "Según $ARGUMENTS" (action handlers)
   - API/endpoints si aplica
   - Frameworks/templates
   - Ejemplos concretos
   - Integración con otras skills
4. Frontmatter validation
5. Test triggers con 10 frases naturales
6. Eval inicial con 5 cases
7. Write .claude/commands/{name}.md
8. (opt) TS module + endpoint
9. Reportar: score + suggestions
```

## Quality criteria

| Métrica              | Target                              |
| -------------------- | ----------------------------------- |
| Trigger accuracy     | > 0.85                              |
| Output relevance     | > 0.80                              |
| Variance             | < 0.20                              |
| Length description   | < 200c                              |
| Body length          | 30-200 líneas                       |
| Examples             | mínimo 3                            |
| Endpoints documented | sí si requiere backend              |
| Duplicates check     | 0 overlap > 50% con skill existente |

## Eval framework

```
Cases por skill:
1. Happy path típico
2. Edge case 1 (input vago)
3. Edge case 2 (input específico técnico)
4. Trigger ambiguo (debería NO activar)
5. Trigger claro (DEBE activar)
```

Para cada case:

- Trigger activado? (true/false)
- Output match expected? (cosine similarity vs reference)
- Latency
- Cost

## Variance test

Misma entrada 10 veces:

- Outputs idénticos? → variance 0 (determinístico)
- Outputs similares? → variance < 0.2 (OK)
- Outputs muy distintos? → variance > 0.5 (mal, ajustar prompt)

## Optimización loop

```
loop:
  current_score = benchmark(skill)
  if current_score < 0.85:
    issues = analyze_failures()
    new_version = generate_improvement(issues)
    new_score = benchmark(new_version)
    if new_score > current_score:
      save(new_version)
  else:
    break
```

Max 5 iteraciones para evitar runaway.

## Audit all output

```
| Skill              | Quality | Triggers | Variance | Duplicates | Status |
|--------------------|---------|----------|----------|------------|--------|
| feedIA-ad-creative | 0.91    | 0.88     | 0.12     | 0          | ✅     |
| feedIA-ai-seo      | 0.79    | 0.92     | 0.18     | 0          | ⚠️     |
| ...                |         |          |          |            |        |
```

## Integración

Output va a `feedIA-run-skill-generator` para auto-generación de skills en bulk desde un TODO list.

## Endpoint

```
POST /api/skills/create   { name, purpose, examples }
POST /api/skills/eval     { name, cases }
GET  /api/skills/audit    → todas las skills + scores
```

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **creador de nuevas skills del cerebro**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
