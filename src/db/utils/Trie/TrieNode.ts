export default class TrieNode {
  public children
  public isEndWord
  public char
  constructor(char) {
    this.children = []
    for (var i = 0; i < 26; i++) {
      //Total # of English Alphabets
      this.children[i] = null
    }
    this.isEndWord = false //will be true if the node represents the end of word
    this.char = char //To store the value of a particular key
  }
  //Function to mark the currentNode as Leaf
  markAsLeaf() {
    this.isEndWord = true
  }

  //Function to unMark the currentNode as Leaf
  unMarkAsLeaf() {
    this.isEndWord = false
  }
}
