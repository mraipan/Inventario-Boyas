import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  addDoc,
  deleteField
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OperationType, FirestoreErrorInfo, Product, Location, Movement, MovementType } from '../types';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Movements Logger
async function logMovement(productId: string, productName: string, type: MovementType, description: string) {
  const path = 'movements';
  try {
    await addDoc(collection(db, path), {
      productId,
      productName,
      type,
      timestamp: serverTimestamp(),
      description,
      userEmail: auth.currentUser?.email
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export const dbService = {
  // Products
  async getProducts() {
    const path = 'products';
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async addProduct(product: Omit<Product, 'createdAt' | 'createdBy' | 'id'>) {
    const path = `products/${product.serie}`;
    try {
      // Ensure we don't send extra fields if they sneak in via 'as any'
      const { id: _, createdAt: __, createdBy: ___, ...cleanProduct } = product as any;
      const newProduct: any = {
        ...cleanProduct,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid
      };

      if (newProduct.estado !== 'Instalado') {
        delete newProduct.profundidad;
      }

      // Safely eliminate any undefined property values
      Object.keys(newProduct).forEach(key => {
        if (newProduct[key] === undefined) {
          delete newProduct[key];
        }
      });

      await setDoc(doc(db, 'products', product.serie), newProduct);
      await logMovement(product.serie, product.nombre, MovementType.CREATE, `Producto creado: ${product.nombre}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    const path = `products/${id}`;
    try {
      const { id: _, createdAt: __, createdBy: ___, ...dataToUpdate } = updates as any;
      const productRef = doc(db, 'products', id);
      const productSnap = await getDoc(productRef);
      const oldData = productSnap.data();

      const finalUpdates: any = {
        ...dataToUpdate,
        updatedAt: serverTimestamp()
      };

      if (finalUpdates.estado !== 'Instalado') {
        finalUpdates.profundidad = deleteField();
      }

      // Safely eliminate any undefined property values
      Object.keys(finalUpdates).forEach(key => {
        if (finalUpdates[key] === undefined) {
          delete finalUpdates[key];
        }
      });

      await updateDoc(productRef, finalUpdates);
      await logMovement(id, updates.nombre || oldData?.nombre, MovementType.UPDATE, `Producto actualizado: ${updates.nombre || oldData?.nombre}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteProduct(id: string, nombre: string) {
    const path = `products/${id}`;
    try {
      await deleteDoc(doc(db, 'products', id));
      await logMovement(id, nombre, MovementType.DELETE, `Producto eliminado: ${nombre}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async batchImportProducts(products: Omit<Product, 'createdAt' | 'createdBy' | 'id'>[]) {
    const path = 'products';
    try {
      if (!auth.currentUser) throw new Error("Debe estar autenticado para importar datos");
      
      const { writeBatch, doc, collection } = await import('firebase/firestore');
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      const uid = auth.currentUser.uid;

      products.forEach((product) => {
        const { id: _, createdAt: __, createdBy: ___, ...cleanProduct } = product as any;
        // Use serie as the document ID for uniqueness enforcement
        const newProductRef = doc(db, 'products', String(product.serie).trim());
        batch.set(newProductRef, {
          ...cleanProduct,
          createdAt: timestamp,
          createdBy: uid
        });
      });

      await batch.commit();
      await logMovement('batch', 'Importación masiva', MovementType.CREATE, `Se importaron ${products.length} productos vía CSV`);
    } catch (error) {
      console.error("Batch Import Error:", error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Locations
  async getLocations() {
    const path = 'locations';
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async addLocation(location: Omit<Location, 'createdAt' | 'createdBy' | 'id'>) {
    const path = 'locations';
    try {
      if (!auth.currentUser) throw new Error("Usuario no autenticado");
      
      const { id: _, createdAt: __, createdBy: ___, ...dataToAdd } = location as any;
      const payload = {
        ...dataToAdd,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid
      };
      
      console.log('Attempting to add location:', payload);
      await addDoc(collection(db, path), payload);
    } catch (error) {
      console.error('Add location error details:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateLocation(id: string, updates: Partial<Location>) {
    const path = `locations/${id}`;
    try {
      if (!auth.currentUser) throw new Error("Usuario no autenticado");

      const { id: _, createdAt: __, createdBy: ___, ...dataToUpdate } = updates as any;
      const payload = {
        ...dataToUpdate,
        updatedAt: serverTimestamp()
      };

      console.log('Attempting to update location:', id, payload);
      await updateDoc(doc(db, 'locations', id), payload);
    } catch (error) {
      console.error('Update location error details:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteLocation(id: string) {
    const path = `locations/${id}`;
    try {
      await deleteDoc(doc(db, 'locations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Movements
  async getMovements() {
    const path = 'movements';
    try {
      const q = query(collection(db, path), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movement));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  getFriendlyErrorMessage(error: any): string {
    try {
      const rawMessage = error?.message || String(error);
      if (rawMessage.startsWith('{')) {
        const parsed = JSON.parse(rawMessage);
        if (parsed.error) {
          const detail = parsed.error.toLowerCase();
          if (detail.includes("permissions") || detail.includes("permission-denied") || detail.includes("insufficient")) {
            return "Error de validación o permisos. Asegúrese de que el número de serie sea válido (letras, números, espacios, guiones, puntos y símbolos como '#' o ':') y que todos los campos requeridos estén completos.";
          }
          return parsed.error;
        }
      }
      return rawMessage;
    } catch (e) {
      const rawMessage = error?.message || String(error);
      if (rawMessage.includes("permissions") || rawMessage.includes("permission-denied") || rawMessage.includes("insufficient")) {
        return "Error de validación o permisos. Asegúrese de que el número de serie sea válido.";
      }
      return rawMessage;
    }
  }
};
