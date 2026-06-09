-- Track whether the member has already paid for the initial van sticker pack.
ALTER TABLE "Member" ADD COLUMN "vanStickerOrderedAt" TIMESTAMP(3);