import test from "node:test";
import assert from "node:assert/strict";
import { isValidRenavam, parseVehicleText } from "./vehicle-parser.ts";

test("validates Brazilian RENAVAM check digit", () => {
  assert.equal(isValidRenavam("01520757236"), true);
  assert.equal(isValidRenavam("01520757230"), false);
  assert.equal(isValidRenavam("11111111111"), false);
});

test("parses exact user WhatsApp example", () => {
  const input = `
[09:32, 11/14/2026] +55 11 99255-5916: 01520757236
[09:32, 11/14/2026] +55 11 99255-5916: URK 4G10
[09:32, 11/14/2026] +55 11 99255-5916: Azul
[09:33, 11/14/2026] +55 11 99255-5916: Honda pop 110i ES gasolina 2026
[09:34, 11/14/2026] +55 11 99255-5916: 9C2JB0100VR447095*
  `;

  const res = parseVehicleText(input);
  assert.equal(res.sourceType, "whatsapp");
  assert.equal(res.fields.renavam, "01520757236");
  assert.equal(res.renavamValid, true);
  assert.equal(res.fields.license_plate, "URK4G10");
  assert.equal(res.plateFormat, "mercosul");
  assert.equal(res.fields.color, "Azul");
  assert.equal(res.fields.brand, "Honda");
  assert.equal(res.fields.model, "Pop 110i ES");
  assert.equal(res.fields.fuel_type, "Gasolina");
  assert.equal(res.fields.year, 2026);
  assert.equal(res.fields.chassis, "9C2JB0100VR447095");
});

test("parses Android WhatsApp export with dashes, bold, emojis, and old plate", () => {
  const input = `
14/11/2026 09:32 - João Motoboy: <Mídia oculta>
14/11/2026 09:33 - João Motoboy: *Yamaha MT-07* _2024_
14/11/2026 09:33 - João Motoboy: 🏍️ Placa: ABC-1234
14/11/2026 09:34 - João Motoboy: Cor: Preta
  `;

  const res = parseVehicleText(input);
  assert.equal(res.sourceType, "whatsapp");
  assert.equal(res.fields.brand, "Yamaha");
  assert.equal(res.fields.model, "MT-07");
  assert.equal(res.fields.year, 2024);
  assert.equal(res.fields.license_plate, "ABC1234");
  assert.equal(res.plateFormat, "tradicional");
  assert.equal(res.fields.color, "Preto");
});

test("parses single-line pipe-separated and freeform WhatsApp message", () => {
  const input = `11/14/26, 9:32 AM - Maria: Placa BRA2E19 | Royal Enfield Meteor 350 2025 | Cor: Vermelha | Combustível: Gasolina`;
  const res = parseVehicleText(input);
  assert.equal(res.sourceType, "whatsapp");
  assert.equal(res.fields.license_plate, "BRA2E19");
  assert.equal(res.fields.brand, "Royal Enfield");
  assert.equal(res.fields.model, "Meteor 350");
  assert.equal(res.fields.year, 2025);
  assert.equal(res.fields.color, "Vermelho");
  assert.equal(res.fields.fuel_type, "Gasolina");
});

test("parses Brazilian CRLV-e digital PDF text layout", () => {
  const crlvText = `
REPÚBLICA FEDERATIVA DO BRASIL
MINISTÉRIO DOS TRANSPORTES
SECRETARIA NACIONAL DE TRÂNSITO - SENATRAN
CERTIFICADO DE REGISTRO E LICENCIAMENTO DE VEÍCULO - CRLV-e
CÓDIGO RENAVAM
01520757236
PLACA
URK4G10
EXERCÍCIO
2026
CHASSI
9C2JB0100VR447095
MARCA / MODELO / VERSÃO
HONDA/POP 110I ES
ANO FABRICAÇÃO
2025
ANO MODELO
2026
COR PREDOMINANTE
AZUL
COMBUSTÍVEL
GASOLINA
  `;

  const res = parseVehicleText(crlvText);
  assert.equal(res.sourceType, "crlv");
  assert.equal(res.fields.renavam, "01520757236");
  assert.equal(res.renavamValid, true);
  assert.equal(res.fields.license_plate, "URK4G10");
  assert.equal(res.fields.chassis, "9C2JB0100VR447095");
  assert.equal(res.fields.brand, "Honda");
  assert.equal(res.fields.model, "Pop 110i ES");
  assert.equal(res.fields.year, 2026);
  assert.equal(res.fields.color, "Azul");
  assert.equal(res.fields.fuel_type, "Gasolina");
});

test("parses imported CRLV brand/model format like I/BMW F 850 GS", () => {
  const crlvText = `
SENATRAN - CRLV-e
MARCA / MODELO / VERSÃO: I/BMW F 850 GS
PLACA: FGH9J12
ANO/MOD: 2023/2024
COR PREDOMINANTE: BRANCA
COMBUSTÍVEL: ALCOOL/GASOLINA
  `;

  const res = parseVehicleText(crlvText);
  assert.equal(res.sourceType, "crlv");
  assert.equal(res.fields.brand, "BMW");
  assert.equal(res.fields.model, "F 850 GS");
  assert.equal(res.fields.license_plate, "FGH9J12");
  assert.equal(res.fields.year, 2024);
  assert.equal(res.fields.color, "Branco");
  assert.equal(res.fields.fuel_type, "Flex");
});
