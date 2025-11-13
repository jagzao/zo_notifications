# Ejemplos de Uso - ZO Notifications

Ejemplos de cómo integrar ZO Notifications en diferentes lenguajes y frameworks.

## 📋 Tabla de Contenidos

- [Bash/Shell](#bash-shell)
- [Python](#python)
- [Node.js/JavaScript](#nodejsjavascript)
- [PHP](#php)
- [Go](#go)
- [Ruby](#ruby)
- [Java](#java)
- [C#/.NET](#cnet)

---

## Bash/Shell

### Script básico

```bash
#!/bin/bash

API_KEY="tu-api-key"
API_URL="http://localhost:3000/api/v1"
PROJECT="mi-script"

# Función para enviar notificación de éxito
notify_success() {
  local title="$1"
  local message="$2"

  curl -s -X POST "$API_URL/notify/success" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{
      \"project\": \"$PROJECT\",
      \"title\": \"$title\",
      \"message\": \"$message\"
    }"
}

# Función para enviar notificación de error
notify_error() {
  local title="$1"
  local error_msg="$2"

  curl -s -X POST "$API_URL/notify/error" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{
      \"project\": \"$PROJECT\",
      \"title\": \"$title\",
      \"error\": {
        \"message\": \"$error_msg\",
        \"severity\": \"high\"
      }
    }"
}

# Ejemplo de uso
if ./deploy.sh; then
  notify_success "Deploy exitoso" "La aplicación se desplegó correctamente"
else
  notify_error "Error en deploy" "Falló el proceso de deploy: $?"
fi
```

### Backup script con notificaciones

```bash
#!/bin/bash

API_KEY="tu-api-key"
API_URL="http://localhost:3000/api/v1"

backup_database() {
  local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"

  pg_dump -h localhost -U user database > "$backup_file" 2>&1

  if [ $? -eq 0 ]; then
    local size=$(du -h "$backup_file" | cut -f1)

    curl -s -X POST "$API_URL/notify/success" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"project\": \"backup-db\",
        \"title\": \"Backup completado\",
        \"message\": \"Backup de base de datos completado exitosamente\",
        \"metadata\": {
          \"file\": \"$backup_file\",
          \"size\": \"$size\",
          \"timestamp\": \"$(date -Iseconds)\"
        }
      }"
  else
    curl -s -X POST "$API_URL/notify/error" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"project\": \"backup-db\",
        \"title\": \"Error en backup\",
        \"error\": {
          \"message\": \"Falló el backup de la base de datos\",
          \"severity\": \"critical\"
        }
      }"
  fi
}

backup_database
```

---

## Python

### Cliente básico

```python
import requests
from typing import Optional, Dict, Any

class ZONotifications:
    def __init__(self, api_key: str, base_url: str = "http://localhost:3000/api/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
            "X-API-Key": api_key
        }

    def _send(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/{endpoint}",
            json=data,
            headers=self.headers,
            timeout=10
        )
        response.raise_for_status()
        return response.json()

    def success(
        self,
        project: str,
        title: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Enviar notificación de éxito"""
        return self._send("notify/success", {
            "project": project,
            "title": title,
            "message": message,
            "metadata": metadata or {}
        })

    def error(
        self,
        project: str,
        title: str,
        error_message: str,
        stack: Optional[str] = None,
        severity: str = "medium",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Enviar notificación de error"""
        return self._send("notify/error", {
            "project": project,
            "title": title,
            "error": {
                "message": error_message,
                "stack": stack,
                "severity": severity
            },
            "context": context or {}
        })

    def warning(
        self,
        project: str,
        title: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Enviar notificación de advertencia"""
        return self._send("notify/warning", {
            "project": project,
            "title": title,
            "message": message,
            "metadata": metadata or {}
        })

# Uso
if __name__ == "__main__":
    notifier = ZONotifications(api_key="tu-api-key")

    try:
        # Simular proceso
        result = some_process()

        notifier.success(
            project="data-pipeline",
            title="ETL completado",
            message=f"Procesados {result['records']} registros",
            metadata={
                "duration": result['duration'],
                "environment": "production"
            }
        )
    except Exception as e:
        import traceback

        notifier.error(
            project="data-pipeline",
            title="Error en ETL",
            error_message=str(e),
            stack=traceback.format_exc(),
            severity="high",
            context={
                "step": "data_processing",
                "timestamp": datetime.now().isoformat()
            }
        )
```

### Decorador para funciones

```python
import functools
import traceback
from typing import Callable

def notify_on_completion(project: str, notifier: ZONotifications):
    """Decorador que envía notificaciones automáticamente"""
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                result = func(*args, **kwargs)

                notifier.success(
                    project=project,
                    title=f"{func.__name__} completado",
                    message=f"La función {func.__name__} se ejecutó correctamente"
                )

                return result
            except Exception as e:
                notifier.error(
                    project=project,
                    title=f"Error en {func.__name__}",
                    error_message=str(e),
                    stack=traceback.format_exc(),
                    severity="high"
                )
                raise
        return wrapper
    return decorator

# Uso
notifier = ZONotifications(api_key="tu-api-key")

@notify_on_completion(project="mi-app", notifier=notifier)
def process_data():
    # Tu lógica aquí
    pass
```

---

## Node.js/JavaScript

### Cliente con axios

```javascript
const axios = require('axios');

class ZONotifications {
  constructor(apiKey, baseURL = 'http://localhost:3000/api/v1') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      timeout: 10000
    });
  }

  async success(project, title, message, metadata = {}) {
    const { data } = await this.client.post('/notify/success', {
      project,
      title,
      message,
      metadata
    });
    return data;
  }

  async error(project, title, errorData, context = {}) {
    const { data } = await this.client.post('/notify/error', {
      project,
      title,
      error: errorData,
      context
    });
    return data;
  }

  async warning(project, title, message, metadata = {}) {
    const { data } = await this.client.post('/notify/warning', {
      project,
      title,
      message,
      metadata
    });
    return data;
  }
}

// Uso
const notifier = new ZONotifications('tu-api-key');

async function main() {
  try {
    await myAsyncFunction();

    await notifier.success(
      'mi-app',
      'Proceso completado',
      'La operación se completó exitosamente'
    );
  } catch (error) {
    await notifier.error(
      'mi-app',
      'Error en proceso',
      {
        message: error.message,
        stack: error.stack,
        severity: 'high'
      },
      {
        timestamp: new Date().toISOString()
      }
    );
  }
}
```

### Express middleware

```javascript
const express = require('express');
const ZONotifications = require('./zo-notifications');

const app = express();
const notifier = new ZONotifications('tu-api-key');

// Middleware para capturar errores
app.use(async (err, req, res, next) => {
  console.error(err);

  // Enviar a ZO Notifications
  await notifier.error(
    'mi-api',
    'Error no manejado',
    {
      message: err.message,
      stack: err.stack,
      severity: 'high'
    },
    {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  );

  res.status(500).json({ error: 'Internal server error' });
});
```

---

## PHP

```php
<?php

class ZONotifications {
    private $apiKey;
    private $baseUrl;

    public function __construct($apiKey, $baseUrl = 'http://localhost:3000/api/v1') {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }

    private function send($endpoint, $data) {
        $ch = curl_init($this->baseUrl . '/' . $endpoint);

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-API-Key: ' . $this->apiKey
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Failed to send notification: HTTP $httpCode");
        }

        return json_decode($response, true);
    }

    public function success($project, $title, $message, $metadata = []) {
        return $this->send('notify/success', [
            'project' => $project,
            'title' => $title,
            'message' => $message,
            'metadata' => $metadata
        ]);
    }

    public function error($project, $title, $errorMessage, $stack = null, $severity = 'medium') {
        return $this->send('notify/error', [
            'project' => $project,
            'title' => $title,
            'error' => [
                'message' => $errorMessage,
                'stack' => $stack,
                'severity' => $severity
            ]
        ]);
    }
}

// Uso
$notifier = new ZONotifications('tu-api-key');

try {
    // Tu código aquí
    $result = someFunction();

    $notifier->success(
        'mi-app-php',
        'Proceso completado',
        'La operación se completó exitosamente'
    );
} catch (Exception $e) {
    $notifier->error(
        'mi-app-php',
        'Error en proceso',
        $e->getMessage(),
        $e->getTraceAsString(),
        'high'
    );
}
```

---

## Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

type ZONotifications struct {
    APIKey  string
    BaseURL string
    Client  *http.Client
}

type SuccessNotification struct {
    Project  string                 `json:"project"`
    Title    string                 `json:"title"`
    Message  string                 `json:"message"`
    Metadata map[string]interface{} `json:"metadata,omitempty"`
}

type ErrorNotification struct {
    Project string                 `json:"project"`
    Title   string                 `json:"title"`
    Error   ErrorData              `json:"error"`
    Context map[string]interface{} `json:"context,omitempty"`
}

type ErrorData struct {
    Message  string `json:"message"`
    Stack    string `json:"stack,omitempty"`
    Severity string `json:"severity"`
}

func NewZONotifications(apiKey string) *ZONotifications {
    return &ZONotifications{
        APIKey:  apiKey,
        BaseURL: "http://localhost:3000/api/v1",
        Client: &http.Client{
            Timeout: 10 * time.Second,
        },
    }
}

func (z *ZONotifications) send(endpoint string, data interface{}) error {
    jsonData, err := json.Marshal(data)
    if err != nil {
        return err
    }

    req, err := http.NewRequest("POST", z.BaseURL+"/"+endpoint, bytes.NewBuffer(jsonData))
    if err != nil {
        return err
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-API-Key", z.APIKey)

    resp, err := z.Client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("failed to send notification: %d", resp.StatusCode)
    }

    return nil
}

func (z *ZONotifications) Success(project, title, message string, metadata map[string]interface{}) error {
    return z.send("notify/success", SuccessNotification{
        Project:  project,
        Title:    title,
        Message:  message,
        Metadata: metadata,
    })
}

func (z *ZONotifications) Error(project, title, errorMsg, stack, severity string, context map[string]interface{}) error {
    return z.send("notify/error", ErrorNotification{
        Project: project,
        Title:   title,
        Error: ErrorData{
            Message:  errorMsg,
            Stack:    stack,
            Severity: severity,
        },
        Context: context,
    })
}

// Uso
func main() {
    notifier := NewZONotifications("tu-api-key")

    if err := processData(); err != nil {
        notifier.Error(
            "mi-app-go",
            "Error en proceso",
            err.Error(),
            "",
            "high",
            nil,
        )
    } else {
        notifier.Success(
            "mi-app-go",
            "Proceso completado",
            "La operación se completó exitosamente",
            nil,
        )
    }
}
```

---

Ver más ejemplos en la [documentación completa de la API](./docs/API.md).
