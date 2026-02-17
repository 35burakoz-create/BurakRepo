#!/usr/bin/env bash
set -euo pipefail

# Basit kontrol: Text('...') içindeki sabit metinleri yakalar (bazı false-positive olabilir)
# Amaç: yeni eklenen hardcoded UI metinlerini erken fark etmek.

rg -n "Text\('\s*[^\$]" lib/screens lib/main.dart || true

echo "Not: Çıktı boş olmalı. Eğer doluysa AppLocalizations anahtarı kullanın."
