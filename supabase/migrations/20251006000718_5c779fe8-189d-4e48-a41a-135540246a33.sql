-- Deletar os planos antigos
DELETE FROM plans;

-- Inserir os planos corretos (usando types existentes)
INSERT INTO plans (name, description, price, type, features, commission_l1, commission_l2_l4, active)
VALUES 
(
  'Plano Smartphone',
  '160 GB de internet 5G',
  129.99,
  'basic',
  '["160 GB de internet 5G", "Velocidade ultra rápida", "Cobertura nacional", "Suporte 24/7", "Sem fidelidade", "Ganhe indicando amigos"]'::jsonb,
  26.00,
  5.00,
  true
),
(
  'Plano Rural',
  '250 GB acumulativos',
  129.99,
  'premium',
  '["250 GB acumulativos", "Ideal para área rural", "Internet estável no campo", "Suporte 24/7", "Sem fidelidade", "Ganhe indicando amigos"]'::jsonb,
  26.00,
  5.00,
  true
);