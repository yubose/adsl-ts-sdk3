// import TrieNode from '../Trie'

// /*
// Explanation:
// https://yatmanwong.medium.com/string-manipulation-with-trie-86927eb1395b
//  */
// class FuzzyIndexCreator2 {
//   public root = new TrieNode()
//   public start = new TrieNode()

//   public FuzzyIndexCreator2() {
//     this.applyMapping()
//   }

//   public applyMapping() {
//     // equivalent to regex ^gen only apply to the front
//     this.addMappingStartOnly(this.start, 'gh', 'g')
//     this.addMappingStartOnly(this.start, 'ge', 'j')
//     this.addMappingStartOnly(this.start, 'gi', 'j')
//     this.addMappingStartOnly(this.start, 'gy', 'j')
//     this.addMappingStartOnly(this.start, 'gen', 'ji')
//     this.addMappingStartOnly(this.start, 'geo', 'jo')

//     this.addMapping(this.start, this.root, '+', '')
//     this.addMapping(this.start, this.root, '0', '`')
//     this.addMapping(this.start, this.root, '1', '{')
//     this.addMapping(this.start, this.root, '2', '{')
//     this.addMapping(this.start, this.root, '3', '{')
//     this.addMapping(this.start, this.root, '4', '|')
//     this.addMapping(this.start, this.root, '5', '|')
//     this.addMapping(this.start, this.root, '6', '|')
//     this.addMapping(this.start, this.root, '7', '}')
//     this.addMapping(this.start, this.root, '8', '}')
//     this.addMapping(this.start, this.root, '9', '}')

//     this.addMapping(this.start, this.root, 'chr', 'kr')

//     // doubls
//     this.addMapping(this.start, this.root, 'cc', 'c')
//     this.addMapping(this.start, this.root, 'dd', 'd')
//     this.addMapping(this.start, this.root, 'gg', 'g')
//     this.addMapping(this.start, this.root, 'll', 'l')
//     this.addMapping(this.start, this.root, 'mm', 'm')
//     this.addMapping(this.start, this.root, 'nn', 'n')
//     this.addMapping(this.start, this.root, 'pp', 'p')
//     this.addMapping(this.start, this.root, 'rr', 'r')
//     this.addMapping(this.start, this.root, 'ss', 's')
//     this.addMapping(this.start, this.root, 'tt', 't')
//     this.addMapping(this.start, this.root, 'zz', 'z')

//     //
//     this.addMapping(this.start, this.root, 'gh', 'f')
//     this.addMapping(this.start, this.root, 'ph', 'f')
//     this.addMapping(this.start, this.root, 'pt', 'd')
//     this.addMapping(this.start, this.root, 'ti', 's')
//     this.addMapping(this.start, this.root, 'ci', 's')
//     this.addMapping(this.start, this.root, 'cl', 'k')
//     this.addMapping(this.start, this.root, 'ng', 'n')
//     this.addMapping(this.start, this.root, 'gn', 'n')
//   }

//   // for regex ^
//   public addMappingStartOnly(
//     start: TrieNode,
//     target: string,
//     replacement: string
//   ) {
//     let cur: TrieNode = start
//     for (let cIdx = 0; cIdx < target.length; cIdx++) {
//       let c = target.charAt(cIdx)
//       cur = cur.addOrGetNext(c)
//       if (cIdx == target.length - 1) {
//         cur.isEnd = true
//         cur.setmValue(replacement)
//         // if (matchMany){ // regex match many, example: (gen)+
//         //     // point back to the beginning character
//         //     let firstChar = target.charAt(0);
//         //     let firstCharNode:TrieNode = start.getNext(firstChar);
//         //     cur.next[firstChar] = firstCharNode;
//         // }
//       }
//     }
//   }

//   // }
//   public addMapping(
//     start: TrieNode,
//     root: TrieNode,
//     target: string,
//     replacement: string
//   ) {
//     this.addMappingStartOnly(start, target, replacement)
//     this.addMappingStartOnly(root, target, replacement)
//   }

//   public mapInput(input: string): string {
//     // todo handle in trie
//     input = input.replace('[aeiouy]+', 'a')
//     input = input.replace('\\W', '`')

//     let result = ''
//     let cur: TrieNode = this.start
//     let curEndNode: TrieNode | null = null // keep track of the end of a sequence, etc group:"abcde", input:"abcdeabg", at g, need to append the value at the end state of 'c'

//     /*
//             A character will check if the previous char, conclude a sequence and append to result
//             if "abc" is a group, "abcd" at d will append mapping of "abc"
//             The reason we do not append at c is because c don't know if the next character is a recurring sequence of "abcabcabc"

//             if "ag" is NOT a group, at g will append a

//             However, if "abc" the c is the end of the input string, we also append itself
//          */
//     for (let cIdx = 0; cIdx < input.length; cIdx++) {
//       let c = input.charAt(cIdx)
//       let prev: TrieNode = cur
//       cur = cur.getNext(c)
//       if (cur != null && cur.isEndWord) {
//         curEndNode = cur // mark the end sequence
//       }
//       if (cur == null || cIdx == input.length - 1) {
//         // sequence ended ( gen, but now we are at gene) or at last character of input (gen, at n)
//         if (curEndNode != null) {
//           result.concat(curEndNode.mValue)
//         }
//         if (cur == null && prev != curEndNode) {
//           // "ag" at g, cur is null, append 'a'
//           result.concat(prev.mValue)
//         }
//         if (cur == null) {
//           cur = this.root.getNext(c) // start new sequence from root again
//         }
//         if (cur != null && cIdx == input.length - 1 && curEndNode != cur) {
//           // is the end, check if need to append the value of current node
//           result.concat(cur.mValue)
//         }
//         curEndNode = null
//       }
//     }
//     return result.toString()
//   }
// }
