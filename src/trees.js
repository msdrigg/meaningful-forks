export function flattenRecursive(treeNode) {
  // Flattens the nodes in a depth first search
  let nodeList = [];
  treeNode.children.forEach((child) => {
    nodeList = nodeList.concat([child], flattenRecursive(child));
  });
  return nodeList;
}

// Based on: https://codeburst.io/javascript-async-await-with-foreach-b6ba62bbf404
export async function asyncForEach(array, callback) {
  const promises = [];
  for (let index = 0; index < array.length; index++) {
    promises.push(callback(array[index], index, array));
  }
  return Promise.all(promises);
}

export function forEachRecursive(treeNode, callback) {
  flattenRecursive(treeNode).forEach(callback);
}

export async function asyncForEachRecursive(treeNode, callback) {
  return asyncForEach(flattenRecursive(treeNode), callback);
}

// Source: https://stackoverflow.com/a/979325/6798201
export function orderByField(field, highToLow, primer) {
  const key = primer
    ? function (x) {
        return primer(x[field]);
      }
    : function (x) {
        return x[field];
      };

  highToLow = !highToLow ? 1 : -1;

  return function (a, b) {
    return [(a = key(a)), (b = key(b)), highToLow * ((a > b) - (b > a))];
  };
}

// Source: https://stackoverflow.com/a/6913821/6798201
export function orderByMultipleFields() {
  const fields = [].slice.call(arguments);
  const fieldNumber = fields.length;

  return function (A, B) {
    let a, b, field, key, highToLow, result, i;

    for (i = 0; i < fieldNumber; i++) {
      result = 0;
      field = fields[i];

      key = typeof field === "string" ? field : field.name;

      a = A[key];
      b = B[key];

      if (typeof field.primer !== "undefined") {
        a = field.primer(a);
        b = field.primer(b);
      }

      highToLow = field.highToLow ? -1 : 1;

      if (a < b) result = highToLow * -1;
      if (a > b) result = highToLow * 1;
      if (result !== 0) break;
    }
    return result;
  };
}
