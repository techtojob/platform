-- "Datos e IA" se separa en "Datos" e "IA" (ver packages/shared/src/listas.ts).
-- Va a IA lo que por el título es de IA o machine learning; data scientist y el resto, a Datos.
UPDATE "ofertas" SET "area" = CASE
  WHEN "titulo" ~* '(data scien|cient[ií]fic[oa] de datos)' THEN 'datos'
  WHEN "titulo" ~* '\m(machine learning|ml|mlops|ia|ai|llms?|genai|generative|deep learning|nlp|computer vision|inteligencia artificial|artificial intelligence)\M' THEN 'ia'
  ELSE 'datos'
END WHERE "area" = 'datos-ia';--> statement-breakpoint
UPDATE "perfiles" SET "area" = CASE
  WHEN "titular" ~* '(data scien|cient[ií]fic[oa] de datos)' THEN 'datos'
  WHEN "titular" ~* '\m(machine learning|ml|mlops|ia|ai|llms?|genai|generative|deep learning|nlp|computer vision|inteligencia artificial|artificial intelligence)\M' THEN 'ia'
  ELSE 'datos'
END WHERE "area" = 'datos-ia';
