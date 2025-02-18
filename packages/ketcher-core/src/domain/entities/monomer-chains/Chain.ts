import { BaseSubChain } from 'domain/entities/monomer-chains/BaseSubChain';
import {
  BaseMonomer,
  Peptide,
  Phosphate,
  SubChainNode,
  Sugar,
} from 'domain/entities';
import {
  getNextMonomerInChain,
  isValidNucleoside,
  isValidNucleotide,
} from 'domain/helpers/monomers';
import { Nucleoside } from 'domain/entities/Nucleoside';
import { Nucleotide } from 'domain/entities/Nucleotide';
import { MonomerSequenceNode } from 'domain/entities/MonomerSequenceNode';
import { EmptySequenceNode } from 'domain/entities/EmptySequenceNode';
import { LinkerSequenceNode } from 'domain/entities/LinkerSequenceNode';

export class Chain {
  public subChains: BaseSubChain[] = [];

  public firstMonomer: BaseMonomer | null;

  public isCyclic = false;

  constructor(firstMonomer?: BaseMonomer, isCyclic?: boolean) {
    this.firstMonomer = null;

    if (firstMonomer) {
      this.firstMonomer = firstMonomer;

      this.fillSubChains(firstMonomer);
    }

    if (isCyclic) {
      this.isCyclic = isCyclic;
    }
  }

  private createSubChainIfNeed(monomer) {
    const needCreateNewSubchain =
      !this.lastNode?.monomer ||
      monomer.isMonomerTypeDifferentForChaining(this.lastNode.monomer);

    if (needCreateNewSubchain) {
      this.subChains.push(new monomer.SubChainConstructor());
    }
  }

  public add(monomer: BaseMonomer) {
    this.createSubChainIfNeed(monomer);

    if (monomer instanceof Sugar) {
      if (isValidNucleoside(monomer)) {
        this.lastSubChain.add(Nucleoside.fromSugar(monomer));
        return;
      }
      if (isValidNucleotide(monomer)) {
        this.lastSubChain.add(Nucleotide.fromSugar(monomer));
        return;
      }
    }
    if (monomer instanceof Peptide) {
      this.lastSubChain.add(new MonomerSequenceNode(monomer));
      return;
    }
    const nextMonomer = getNextMonomerInChain(monomer);
    const isNextMonomerNucleosideOrNucleotideOrPeptide = () => {
      const isNucleosideOrNucleotide =
        nextMonomer instanceof Sugar &&
        (isValidNucleotide(nextMonomer) || isValidNucleoside(nextMonomer));
      return isNucleosideOrNucleotide || nextMonomer instanceof Peptide;
    };
    if (
      monomer instanceof Phosphate &&
      (!this.lastNode || this.lastNode instanceof Nucleoside) &&
      (!nextMonomer || isNextMonomerNucleosideOrNucleotideOrPeptide())
    ) {
      this.lastSubChain.add(new MonomerSequenceNode(monomer));
      return;
    }
    this.lastSubChain.add(new LinkerSequenceNode(monomer));
  }

  public addNode(node: SubChainNode) {
    this.createSubChainIfNeed(node.monomer);

    this.lastSubChain.add(node);

    return this;
  }

  private fillSubChains(monomer?: BaseMonomer) {
    if (!monomer) return;

    this.add(monomer);

    this.fillSubChains(
      getNextMonomerInChain(
        this.lastNode?.lastMonomerInNode,
        this.firstMonomer,
      ),
    );
  }

  public get lastSubChain() {
    return this.subChains[this.subChains.length - 1];
  }

  public get nodes() {
    const nodes: SubChainNode[] = [];
    this.subChains.forEach((subChain) => {
      nodes.push(...subChain.nodes);
    });

    return nodes;
  }

  public get lastNode():
    | EmptySequenceNode
    | MonomerSequenceNode
    | Nucleoside
    | Nucleotide
    | undefined {
    return this.lastSubChain?.lastNode;
  }

  public get lastNonEmptyNode() {
    if (this.lastNode instanceof EmptySequenceNode) {
      const nodes = this.nodes;

      return nodes[nodes.length - 2];
    } else {
      return this.lastNode;
    }
  }

  public get firstSubChain() {
    return this.subChains[0];
  }

  public get firstNode() {
    return this.firstSubChain?.firstNode;
  }

  public get length() {
    let length = 0;
    this.subChains.forEach((subChain) => {
      length += subChain.length;
    });

    return length;
  }

  public get isEmpty() {
    return (
      this.subChains.length === 1 &&
      this.subChains[0].nodes.length === 1 &&
      this.subChains[0].nodes[0] instanceof EmptySequenceNode
    );
  }

  public forEachNode(
    callback: ({
      node,
      subChain,
    }: {
      node: SubChainNode;
      subChain: BaseSubChain;
    }) => void,
  ) {
    this.subChains.forEach((subChain) => {
      subChain.nodes.forEach((node) => {
        callback({ node, subChain });
      });
    });
  }
}
