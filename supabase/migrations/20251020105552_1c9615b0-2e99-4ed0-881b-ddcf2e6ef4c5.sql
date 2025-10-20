-- Adicionar unique constraint no event_id para garantir idempotência total
ALTER TABLE asaas_webhook_events 
ADD CONSTRAINT asaas_webhook_events_event_id_unique UNIQUE (event_id);