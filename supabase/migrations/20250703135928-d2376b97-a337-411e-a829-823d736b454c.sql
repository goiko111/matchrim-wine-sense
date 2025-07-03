-- Insertar los 16 estilos Winerim específicos
INSERT INTO public.wine_styles (name, description, potente, acidez, dulce, tanico, afrutado) VALUES
('Elegante', 'Vinos de gran finura y distinción. Perfectos para ocasiones especiales y maridajes sofisticados.', 3, 4, 2, 3, 3),
('Potente', 'Vinos de gran intensidad y carácter. Ideales para acompañar carnes rojas y platos con sabores intensos.', 5, 3, 2, 4, 3),
('Delicado', 'Vinos suaves y refinados. Perfectos para aperitivos y momentos de contemplación.', 2, 3, 3, 2, 4),
('Fresco', 'Vinos vivaces y refrescantes. Ideales para días cálidos y comidas ligeras.', 2, 5, 2, 1, 4),
('Goloso', 'Vinos afrutados y expresivos. Perfectos para disfrutar en cualquier momento.', 3, 3, 4, 2, 5),
('Mineral', 'Vinos con carácter terroso y mineral. Expresan fielmente su origen geológico.', 3, 4, 1, 3, 2),
('Frutal', 'Vinos con intensos aromas frutales. Ideales para quienes buscan expresión y vivacidad.', 3, 3, 3, 2, 5),
('Especiado', 'Vinos con notas especiadas y complejas. Perfectos para maridajes gastronómicos elaborados.', 4, 3, 2, 4, 3),
('Aromático', 'Vinos con bouquet intenso y envolvente. Seducen desde el primer encuentro olfativo.', 3, 4, 3, 2, 4),
('Estructurado', 'Vinos con gran armazón tánico. Ideales para guarda y maridajes con carnes.', 4, 3, 2, 5, 3),
('Sedoso', 'Vinos de textura aterciopelada. Ofrecen una experiencia táctil única en boca.', 3, 3, 3, 3, 4),
('Vibrante', 'Vinos llenos de energía y dinamismo. Despiertan todos los sentidos.', 4, 4, 2, 3, 4),
('Opulento', 'Vinos ricos y generosos. Ofrecen una experiencia sensorial completa.', 5, 3, 3, 4, 4),
('Austero', 'Vinos de expresión contenida pero profunda. Revelan su complejidad con paciencia.', 3, 4, 1, 4, 2),
('Expresivo', 'Vinos que comunican intensamente su carácter. Narran la historia de su terruño.', 4, 4, 2, 3, 4),
('Equilibrado', 'Vinos de perfecta armonía. Donde todos los elementos se integran magistralmente.', 3, 3, 3, 3, 3)
ON CONFLICT (name) DO NOTHING;