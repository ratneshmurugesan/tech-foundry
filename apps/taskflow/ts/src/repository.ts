
class InMemoryRepository<T extends { id: string }> {
    private storage: Map<string, T> = new Map();

    async findAll(): Promise<Array<T>> {
        return Array.from(this.storage.values());
    }

    async findById(id: string): Promise<T | undefined> {
        return this.storage.get(id) || undefined;
    }

    async save(entity: T): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.storage.set(String(entity.id), entity);
    }

    async delete(id: string): Promise<boolean> {
        return this.storage.delete(id);
    }
}

export default InMemoryRepository;