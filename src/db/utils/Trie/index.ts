import TrieNode from './TrieNode'
import log from '../../../utils/log'

export default class Trie {
  public root
  constructor() {
    this.root = new TrieNode('') //Root node
  }

  getIndex(t) {
    return t.charCodeAt(0) - 'a'.charCodeAt(0)
  }
  //Function to insert a key in the Trie
  insert(key) {
    if (key == null) {
      return
    }

    key = key.toLowerCase()
    let currentNode = this.root
    let index = 0

    //Store the character index
    //Iterate the trie with the given character index,
    //If the index points to null
    //simply create a TrieNode and go down a level
    for (let level = 0; level < key.length; level++) {
      index = this.getIndex(key[level])

      if (currentNode.children[index] == null) {
        currentNode.children[index] = new TrieNode(key[level])
        log.debug(String(key[level]) + ' inserted')
      }
      currentNode = currentNode.children[index]
    }

    //Mark the end character as leaf node
    currentNode.markAsLeaf()
    log.debug("'" + key + "' inserted")
  }

  //Function to search a given key in Trie
  search(key) {
    if (key == null) {
      return false //null key
    }

    key = key.toLowerCase()
    let currentNode = this.root
    let index = 0

    //Iterate the Trie with given character index,
    //If it is null at any point then we stop and return false
    //We will return true only if we reach leafNode and have traversed the
    //Trie based on the length of the key

    for (var level = 0; level < key.length; level++) {
      index = this.getIndex(key[level])
      if (currentNode.children[index] == null) {
        return false
      }
      currentNode = currentNode.children[index]
    }
    if (currentNode != null && currentNode.isEndWord) {
      return true
    }
    return false
  }
  //Helper Function
  hasNoChildren(currentNode) {
    for (let i = 0; i < currentNode.children.length; i++) {
      if (currentNode.children[i] != null) return false
    }
    return true
  }

  //Recursive function
  deleteHelper(key, currentNode, length, level) {
    let deletedSelf = false

    if (currentNode == null) {
			log.warn('Key does not exist')
      return deletedSelf
    }

    //Base Case: If we have reached the node which points to the alphabet at the end of the key.
    if (level == length) {
      //If there are no nodes ahead of this node in this path
      //Then we can delete this node
      if (this.hasNoChildren(currentNode)) {
        currentNode = null
        deletedSelf = true
      }

      //If there are nodes ahead of currentNode in this path
      //Then we cannot delete currentNode. We simply unmark this as leaf
      else {
        currentNode.unMarkAsLeaf()
        deletedSelf = false
      }
    } else {
      let childNode = currentNode.children[this.getIndex(key[level])]
      let childDeleted = this.deleteHelper(key, childNode, length, level + 1)
      if (childDeleted) {
        //Making children pointer also None: since child is deleted
        currentNode.children[this.getIndex(key[level])] = null
        //If currentNode is leaf node that means currentNode is part of another key
        //and hence we can not delete this node and it's parent path nodes
        if (currentNode.isEndWord) deletedSelf = false
        //If childNode is deleted but if currentNode has more children then currentNode must be part of another key
        //So, we cannot delete currentNode
        else if (this.hasNoChildren(currentNode) == false) deletedSelf = false
        //Else we can delete currentNode
        else {
          currentNode = null
          deletedSelf = true
        }
      } else deletedSelf = false
    }
    return deletedSelf
  }
  //Function to delete given key from Trie
  delete(key) {
    if (this.root == null || key == null) {
      log.error('None key or empty trie error')
      return
    }

    this.deleteHelper(key, this.root, key.length, 0)
  }
}
// Input keys (use only 'a' through 'z' and lower case)
let keys = ['the', 'a', 'there', 'answer', 'any', 'by', 'bye', 'their', 'abc']
let t = new Trie()
log.debug('Keys to insert: ')
log.debug(keys)
//Construct Trie
for (let i = 0; i < keys.length; i++) {
  t.insert(keys[i])
}
log.debug(t)
