// Exemplo: ESP32 enviando leituras para o manual interativo do Bell 429 (rede local, servidor WAMP).
// Os ids das leituras devem ser os mesmos de sensores.js (ex.: temp_trans, chip_trgb, v_bat).
// Demonstração – ajuste pinos, sensores e calibração ao seu hardware.
#include <WiFi.h>
#include <HTTPClient.h>

const char* REDE    = "NOME_DO_WIFI";
const char* SENHA   = "SENHA_DO_WIFI";
const char* DESTINO = "http://192.168.1.51/api/telemetria.php";   // IP fixo do PC com o WAMP
const char* CHAVE   = "";                                          // igual à CHAVE de api/telemetria.php (se usada)

const int PINO_TEMP = 34;   // sensor analógico de temperatura (exemplo)
const int PINO_CHIP = 27;   // contato do detector de limalha (fecha = partícula detectada)

void setup() {
  Serial.begin(115200);
  pinMode(PINO_CHIP, INPUT_PULLUP);
  WiFi.begin(REDE, SENHA);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nConectado: " + WiFi.localIP().toString());
}

void loop() {
  float tempC = analogRead(PINO_TEMP) * (3.3 / 4095.0) * 100.0;   // exemplo de conversão (sensor 10 mV/°C)
  int   chip  = digitalRead(PINO_CHIP) == LOW ? 1 : 0;

  String corpo = "{\"leituras\":{\"temp_trans\":" + String(tempC, 1) + ",\"chip_trans\":" + String(chip) + "}}";

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(DESTINO);
    http.addHeader("Content-Type", "application/json");
    if (strlen(CHAVE)) http.addHeader("X-Chave", CHAVE);
    int codigo = http.POST(corpo);
    Serial.printf("Envio: %d  %s\n", codigo, corpo.c_str());
    http.end();
  }
  delay(2000);   // a página considera "sem sinal" após 30 s sem leitura
}
