
-- Verificar si ya existen los 16 estilos Winerim predefinidos
-- Si no existen, los insertaremos
INSERT INTO public.wine_styles (name, description, potente, acidez, dulce, tanico, afrutado) VALUES
('Elegante', 'Vinos refinados con equilibrio perfecto entre todos sus componentes', 2, 3, 2, 2, 3),
('Potente', 'Vinos de gran intensidad y concentración aromática', 5, 2, 1, 4, 2),
('Delicado', 'Vinos sutiles con aromas ligeros y estructura suave', 1, 2, 2, 1, 2),
('Fresco', 'Vinos vivaces con acidez marcada y notas cítricas', 2, 5, 1, 1, 3),
('Goloso', 'Vinos con dulzura natural y sabores intensos', 3, 2, 5, 2, 4),
('Mineral', 'Vinos con carácter terroso y notas minerales distintivas', 3, 4, 1, 3, 2),
('Frutal', 'Vinos que destacan por su expresión frutal intensa', 2, 3, 2, 2, 5),
('Especiado', 'Vinos con notas aromáticas de especias y hierbas', 4, 3, 2, 3, 3),
('Aromático', 'Vinos con intensidad aromática excepcional', 3, 3, 3, 2, 4),
('Estructurado', 'Vinos con taninos firmes y gran capacidad de guarda', 4, 3, 1, 5, 2),
('Sedoso', 'Vinos de textura suave y taninos integrados', 2, 2, 3, 2, 3),
('Vibrante', 'Vinos con energía y vivacidad en boca', 3, 4, 2, 2, 4),
('Opulento', 'Vinos ricos y generosos con gran concentración', 4, 2, 4, 3, 3),
('Austero', 'Vinos serios con carácter contenido y elegante', 3, 4, 1, 4, 2),
('Expresivo', 'Vinos que transmiten claramente su origen y variedad', 3, 3, 2, 3, 4),
('Equilibrado', 'Vinos con armonía perfecta entre todos sus elementos', 3, 3, 3, 3, 3)
ON CONFLICT (name) DO NOTHING;
