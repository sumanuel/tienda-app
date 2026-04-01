Reglas sugeridas para Firestore

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /products/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /customers/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /suppliers/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /sales/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /accounts_receivable/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /accounts_payable/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /account_payments/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /inventory_movements/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /settings/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /exchange_rates/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /rate_notifications/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /mobile_payments/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /tables/{tableName} {
        allow read, write: if isOwner(userId);

        match /rows/{rowId} {
          allow read, write: if isOwner(userId);
        }
      }

      match /cloud_snapshots/{datasetName} {
        allow read, write: if isOwner(userId);

        match /rows/{rowId} {
          allow read, write: if isOwner(userId);
        }
      }

      match /{document=**} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

Notas

- Estas reglas asumen que toda la data de la app vive bajo users/{uid}.
- Cubren las colecciones cloud-first actuales: products, customers, suppliers, sales, accounts_receivable, accounts_payable, account_payments, inventory_movements, settings, exchange_rates, rate_notifications y mobile_payments.
- También cubren los respaldos/snapshots usados por la app en tables y cloud_snapshots.
- Si luego agregas nuevas subcolecciones bajo users/{uid}, ya quedan cubiertas por el match recursivo final.
