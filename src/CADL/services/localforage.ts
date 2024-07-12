import localforage from "localforage";

localforage.config ({
    name: "dataIndex"
})

const indexLocalForage = localforage.createInstance({
    name: "dataIndex"
})

export default indexLocalForage
