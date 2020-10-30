
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { ethers } from 'ethers';
import { BigNumber } from 'bignumber.js';

import { blockchainConstants } from '../../../environments/blockchain-constants';
import { SharedService } from '../../commonData.service';
import { tokenToDecimals, toDecimal } from '../../utils';

import * as CashBoxFactory from '../../../assets/contracts/DeployFactory.json';
import * as CashBox from '../../../assets/contracts/CashBox.json';
import * as ERC20Detailed from '../../../assets/contracts/ERC20Detailed.json';

declare var $: any;
declare var cApp: any;
BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_DOWN });

@Component({
  selector: 'index',
  templateUrl: './index.component.html',
  encapsulation: ViewEncapsulation.None,
  providers: []
})
export class IndexComponent implements OnInit {

  formdata;
  public web3: any;
  public userAddress: any;
  public Contracts: any;
  public contractAddresses: any;

  public cashBoxData = [];
  public showAllCashBoxes = false;

  constructor(private sharedService: SharedService) {
    this.createDeployForm();
  }

  ngOnInit() {
    this.sharedService.proceedApp$.subscribe(
      value => {
        if (value === true) {
          this.initializeProvider();
        }
      },
      error => console.error(error)
    );
  }

  private createDeployForm() {
    this.formdata = new FormGroup({
      cashToken: new FormControl('', [Validators.required]),
      assetToCashRate: new FormControl('', [Validators.required]),
      cashCap: new FormControl({value: '100,000,000', disabled: true}),
    });
  }

  public async initializeProvider() {
    try {
      this.web3 = await this.sharedService.web3;

      await this.setup();
    } catch (error) {
      throw error;
    }
  }

  public reloadPage() {
    window.location.reload();
  }

  public async setup() {
    this.userAddress = await this.web3.getSigner().getAddress();
    // this.userAddress = '0xd49310f57363ea072a7208e77a82ee82cf250a19';
    cApp.blockPage({
      overlayColor: '#000000',
      state: 'secondary',
      message: 'Loading App...'
    });
    this.contractAddresses = await this.getContractAddresses();

    // In case of unknown networks
    if (typeof this.contractAddresses === 'undefined') { return; }

    this.initAllContracts(this.contractAddresses);

    await this.initData();
    cApp.unblockPage();
    // console.log(this.userCashBoxData);
  }

  get cashTokens() {
    if (this.contractAddresses === undefined) return {};
    return this.contractAddresses.cashTokens;
  }

  private async getContractAddresses() {
    let contractAddresses = {};
    const network = await this.web3.getNetwork();
    if (network.name === 'homestead') {
      contractAddresses = blockchainConstants.mainnet;
    } else {
      contractAddresses = blockchainConstants[network.name];
    }
    return contractAddresses;
  }

  private initContract(contractAddress, abi) {
    return new ethers.Contract(contractAddress, abi, this.web3.getSigner());
  }

  private async initAllContracts(contractAddresses) {
    this.Contracts = {};
    this.Contracts.CashBoxFactory = this.initContract(contractAddresses.CashBoxFactory, CashBoxFactory.abi);
  }

  private async initData() {
    let cashBoxes;
    if (this.showAllCashBoxes === false) {
      cashBoxes = await this.Contracts.CashBoxFactory.getCashBoxesByUser(this.userAddress);
    } else if (this.showAllCashBoxes === true) {
      cashBoxes = await this.Contracts.CashBoxFactory.getAllCashBoxes();
    }
    this.cashBoxData = [];
    for (const cashboxAddress of cashBoxes) {
      const cashbox = {} as any;
      cashbox.cashboxAddress = cashboxAddress;
      this.cashBoxData.push(cashbox);
      this.initCashbox(cashbox);
    }
  }

  private async initCashbox(cashbox) {
    const CashBoxC = this.initContract(cashbox.cashboxAddress, CashBox.abi);
    CashBoxC.name().then(name => {
      cashbox.name = name;
    });
  }

  public async deployNewAsset(form) {
    const cashTokenAddr = this.contractAddresses.cashTokens[form.cashToken];
    if (cashTokenAddr === undefined || cashTokenAddr === '') return;

    const CashErc20C = this.initContract(cashTokenAddr, ERC20Detailed.abi);
    const decimals = await CashErc20C.decimals();
    const cashCapDecimals = tokenToDecimals('100000000', decimals);

    const allCashboxes = await this.Contracts.CashBoxFactory.getAllCashBoxes();
    const newCashboxSymbol = `CB${parseFloat(allCashboxes.length) + 1}`;

    const cashSym = await CashErc20C.symbol();
    const newCashboxName = `${cashSym}-OPEN-${toDecimal(form.assetToCashRate, 4)}`;

    const tx = await this.Contracts.CashBoxFactory.createCashBox(
      cashTokenAddr, this.contractAddresses.assetTokens.OPEN, ethers.utils.parseEther(form.assetToCashRate.toString()),
      cashCapDecimals, newCashboxName, newCashboxSymbol, '');

    await this.web3.waitForTransaction(tx.hash);

    this.createDeployForm();
    this.initData();
  }

  public toggleAllCashboxSwitch() {
    this.cashBoxData = [];
    this.showAllCashBoxes = !this.showAllCashBoxes;
    this.initData();
  }

}
