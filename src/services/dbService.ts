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
  addDoc
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
      const newProduct = {
        ...product,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid
      };
      await setDoc(doc(db, 'products', product.serie), newProduct);
      await logMovement(product.serie, product.nombre, MovementType.CREATE, `Producto creado: ${product.nombre}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    const path = `products/${id}`;
    try {
      const productRef = doc(db, 'products', id);
      const productSnap = await getDoc(productRef);
      const oldData = productSnap.data();

      const finalUpdates = {
        ...updates,
        updatedAt: serverTimestamp()
      };
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
      await addDoc(collection(db, path), {
        ...location,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateLocation(id: string, updates: Partial<Location>) {
    const path = `locations/${id}`;
    try {
      await updateDoc(doc(db, 'locations', id), updates);
    } catch (error) {
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
  }
};
