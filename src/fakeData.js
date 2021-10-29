export const fakeDBData = [...Array(500).keys()].map(i => ({name: `John_${i}`, age: Math.floor(Math.random()*(90-30) + 30)}));
