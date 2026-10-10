-- Migration 0012: Add withdrawal confirmation with timeout columns
-- Adds columns to Movimentacao for tracking confirmation/withdrawal workflow
-- and seeds configuration keys for timeout and expiration alert settings.


-- ── Movimentacao: new columns for confirmation workflow ──────────────

ALTER TABLE public."Movimentacao"
    ADD COLUMN IF NOT EXISTS "data_solicitacao" TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS "data_confirmacao" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "prazo_horas" INT DEFAULT 48,
    ADD COLUMN IF NOT EXISTS "status_confirmacao" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE';


-- Index for the cron job that scans confirmed but not yet withdrawn
CREATE INDEX IF NOT EXISTS idx_mov_status_confirmacao
    ON public."Movimentacao" ("status_confirmacao")
    WHERE "status_confirmacao" = 'CONFIRMADA';


-- ── MovimentacaoExemplar: track reminder emails sent ─────────────────

ALTER TABLE public."MovimentacaoExemplar"
    ADD COLUMN IF NOT EXISTS "emailConfirmacaoNotificadoEm" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "emailLembreteConfHoras" TEXT;


-- ── Configuration seeds ──────────────────────────────────────────────

INSERT INTO public."Configuracoes"
    (chave, valor, descricao, categoria, ativo)
VALUES
    (
        'prazo_confirmacao_horas',
        '48',
        'Prazo máximo em horas para retirada após confirmação do admin',
        'geral',
        true
    ),
    (
        'alerta_expiracao_horas',
        '2',
        'Horas antes do prazo limite para envio de alerta de expiração',
        'notificacoes',
        true
    )
ON CONFLICT (chave) DO UPDATE
SET
    valor = EXCLUDED.valor,
    descricao = EXCLUDED.descricao,
    categoria = EXCLUDED.categoria,
    ativo = EXCLUDED.ativo;