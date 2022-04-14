import * as fs from 'fs'
import path from 'path';

type Parameter = {
  name: string;
  type: string;
}

type StateMutability = "payable" | "nonpayable" | "pure" | "view"

type FunctionItem = {
  name: string,
  inputs: Parameter[],
  outputs: Parameter[],
  stateMutability: StateMutability,
  type: "function" | "constructor",
}

type EventItem = {
  name: string,
  inputs: Parameter[],
  type: "event",
}

type Network = {
  address: string;
}

type AbiJson = {
  contractName: string;
  abi: Array<EventItem | FunctionItem>;
  networks: { [key: string]: Network }
}

const allContractNames: string[] = []
let allTypes: string[] = []


export async function genByFile(filename: string) {
  try {
    allTypes = []
    const content = await readFile(filename)
    const abiJson: AbiJson = JSON.parse(content)
    allContractNames.push(abiJson.contractName)
    const contractString = genContract(abiJson.contractName, abiJson.abi.filter(x => x.type === "function") as FunctionItem[])
    return contractString
  } catch (e) {
    console.log(e)
  }
}

function genContract(name: string, functions: FunctionItem[]) {
  const initContract = `this.contract = new web3.eth.Contract(${name}.abi as any, ${name}.networks[networkId].address)`
  const functionsString = genFunctions(functions)
  const typeAlias = allTypes.map(x => {
    if (x.startsWith('Uint')) {
      return `type ${x} = number | string`
    } else {
      return `type ${x} = string`
    }
  })

  return (
    `import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import * as ${name} from '../json/${name}.json'
import { Service } from '../base'
import { networkId } from '../base'

${typeAlias.join('\n')}

export default class ${name}Contract {
  contract: Contract

  constructor(web3: Web3) {
    ${initContract}
  }

${functionsString}
}`
  )
}

function genFunctions(items: FunctionItem[]) {
  return items.map(genFunction).join('\n\n')
}

function genFunction(item: FunctionItem) {
  const inputsFormatted = item.inputs.map(x => ({
    name: x.name.replace(/_/, ''),
    type: upperFirst(x.type)
  }))

  const parameters = inputsFormatted.map(x => {
    let xType = x.type.replace('[]', '')
    if (allTypes.indexOf(xType) === -1) {
      allTypes.push(xType)
    }
    return x
  }).filter(x => x.name.length > 0 && x.type.length > 0).map(x => `${x.name}: ${x.type}`)
    .join(', ')

  const isSend = item.stateMutability !== "pure" && item.stateMutability !== "view"
  return `  ${item.name}(${parameters}) {
    const method = this.contract.methods.${item.name}(${inputsFormatted.map(x => x.name).join(', ')})
    return new Service(method, ${isSend})
  }`
}

// utils
function readFile(filePath: fs.PathOrFileDescriptor): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

function upperFirst(s: string) {
  if (s.length === 0) {
    return s
  } else if (s.length === 1) {
    return s.toUpperCase()
  } else {
    return `${s.slice(0, 1).toUpperCase()}${s.slice(1)}`
  }
} 