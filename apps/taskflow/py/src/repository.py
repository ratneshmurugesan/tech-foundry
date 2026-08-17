from typing import TypeVar, Generic, List, Dict, Optional 
import asyncio

__all__ = ["InMemoryRepository"]

T = TypeVar("T")

class InMemoryRepository(Generic[T]):
    def __init__(self) -> None:
        self.__storage: Dict[str, T] = {}

    async def findAll(self) -> List[T]:
        return list(self.__storage.values())

    async def findById(self, id: str) -> Optional[T]:
        return self.__storage.get(str(id))

    async def save(self, entity: T) -> None:
        await asyncio.sleep(1)
        entity_id = str(getattr(entity, "id"))
        self.__storage[entity_id] = entity

    async def delete(self, id: str) -> bool:
        removed_entity = self.__storage.pop(str(id), None)
        return removed_entity is not None