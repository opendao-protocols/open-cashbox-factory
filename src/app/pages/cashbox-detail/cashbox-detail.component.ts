import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ethers } from 'ethers';

import { SharedService } from '../../commonData.service';
import { decimalsToToken, tokenToDecimals, toDecimalDisp } from '../../utils';
import * as CashBox from '../../../assets/contracts/CashBox.json';
import * as ERC20Detailed from '../../../assets/contracts/ERC20Detailed.json';

declare var cApp: any;
declare var $: any;

@Component({
  selector: 'app-cashbox-detail',
  templateUrl: './cashbox-detail.component.html',
  styleUrls: ['./cashbox-detail.component.scss']
})
export class CashboxDetailComponent implements OnInit {

  private web3: any;
  private userAddress: any;
  public contractData: any = {};
  public modalData: any = {};
  public etherscanPrefix: any;
  public userInput = {
    buyCashbox: {
      amt: 0,
      loader: false
    },
    burnCashbox: {
      amt: 0,
      loader: false
    },
    redeemAssetToken: {
      amt: 0,
      loader: false
    }
  }
  public toDecimalDisp = toDecimalDisp;

  constructor(private route: ActivatedRoute, private sharedService: SharedService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.contractData.cashboxAddress = params.get('cashboxAddress');
    });

    this.sharedService.proceedApp$.subscribe(
      value => {
        if (value === true) {
          this.initializeProvider();
        }
      },
      error => console.error(error)
    );
  }

  private async initializeProvider() {
    try {
      this.web3 = await this.sharedService.web3;
      await this.setup();

    } catch (error) {
      throw error;
    }
  }

  private async setup() {
    this.userAddress = await this.web3.getSigner().getAddress();
    // this.userAddress = '0xd49310f57363ea072a7208e77a82ee82cf250a19';
    cApp.blockPage({
      overlayColor: '#000000',
      state: 'secondary',
      message: 'Loading App...'
    });


    this.contractData.CashboxC = this.initContract(this.contractData.cashboxAddress, CashBox.abi);

    await this.initData();
    setTimeout(() => {
      this.fetchBalances();
    }, 3000);

    setTimeout(() => {
      cApp.unblockPage();
    }, 2000);

    this.setEtherscanPrefix();
    // console.log(this.contractData);
  }

  private initContract(contractAddress, abi) {
    return new ethers.Contract(contractAddress, abi, this.web3.getSigner());
  }

  private async setEtherscanPrefix() {
    let str = '';
    const network = await this.web3.getNetwork();
    if (network.name !== 'homestead') {
      str = `${network.name}.`;
    }

    this.etherscanPrefix = `https://${str}etherscan.io/address/`;
  }

  private initData() {
    const CashboxC = this.contractData.CashboxC;
    CashboxC.decimals().then(decimals => {
      this.contractData.cashboxTokenDecimals = decimals;
    });
    CashboxC.name().then(name => {
      this.contractData.cashboxTokenName = name;
    });
    CashboxC.cash().then(cashAddr => {
      this.contractData.cashTokenAddress = cashAddr;

      const CashTokenC = this.initContract(cashAddr, ERC20Detailed.abi);

      CashTokenC.decimals().then(decimals => {
        this.contractData.cashTokenDecimals = decimals;

        CashboxC.cashValauationCap().then(cashValuationCap => {
          cashValuationCap = decimalsToToken(cashValuationCap, this.contractData.cashTokenDecimals);
          this.contractData.cashboxCap = cashValuationCap;

          this.fetchBalances();     // fetch
        });
      });
      CashTokenC.symbol().then(symbol => {
        this.contractData.cashTokenSymbol = symbol;
      });
      this.fetchEnabled(this.contractData.cashTokenAddress).then(bool => {
        this.contractData.cashEnabled = bool;
      });
    });
    CashboxC.stockToken().then(stockAddr => {
      this.contractData.assetTokenAddress = stockAddr;

      const AssetTokenC = this.initContract(stockAddr, ERC20Detailed.abi);

      AssetTokenC.decimals().then(decimals => {
        this.contractData.assetTokenDecimals = decimals;
      });
      AssetTokenC.symbol().then(symbol => {
        this.contractData.assetTokenSymbol = symbol;
      });
      AssetTokenC.name().then(name => {
        this.contractData.assetTokenName = name;
      });
      this.fetchEnabled(this.contractData.assetTokenAddress).then(bool => {
        this.contractData.assetEnabled = bool;
      });
    });
  }

  private fetchBalances() {
    this.getErc20Balance(this.contractData.cashTokenAddress, this.contractData.cashboxAddress, this.contractData.cashTokenDecimals).then(bal => {
      this.contractData.cashboxCashBal = bal;
    });

    this.getErc20Balance(this.contractData.assetTokenAddress, this.contractData.cashboxAddress, this.contractData.assetTokenDecimals).then(bal => {
      this.contractData.cashboxAssetBal = bal;
    });

    this.contractData.CashboxC.totalSupply().then(supply => {
      this.contractData.cashboxTotalSupply = decimalsToToken(supply, this.contractData.cashboxTokenDecimals);
    });

    this.contractData.CashboxC.stockToCashRate().then(assetToCashRate => {
      this.contractData.assetToCashRate = decimalsToToken(assetToCashRate, this.contractData.cashTokenDecimals);
    });

    this.contractData.CashboxC.contractCashValuation().then(cashboxValuation => {
      this.contractData.cashboxValuation = decimalsToToken(cashboxValuation, this.contractData.cashTokenDecimals);
    });

    this.getErc20Balance(this.contractData.cashTokenAddress, this.userAddress, this.contractData.cashTokenDecimals).then(bal => {
      this.contractData.userCashBal = bal;
    });

    this.getErc20Balance(this.contractData.assetTokenAddress, this.userAddress, this.contractData.assetTokenDecimals).then(bal => {
      this.contractData.userAssetTokenBal = bal;
    });

    this.getErc20Balance(this.contractData.cashboxAddress, this.userAddress, this.contractData.cashboxTokenDecimals).then(bal => {
      this.contractData.userCashboxBal = bal;
    });

  }

  private async getErc20Balance(contractAddr, account, tokenDecimals) {
    const Erc20Contract = this.initContract(contractAddr, ERC20Detailed.abi);
    let bal = await Erc20Contract.balanceOf(account);
    return decimalsToToken(bal, tokenDecimals);
  }

  private async fetchEnabled(contractAddr) {
    const infiniteAllowance = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

    const Erc20Contract = this.initContract(contractAddr, ERC20Detailed.abi);
    const allowance = await Erc20Contract.allowance(this.userAddress, this.contractData.CashboxC.address);
    return parseFloat(allowance) === parseFloat(infiniteAllowance);
  }

  public hideModal() {
    $('#cashboxModal').modal('hide');
    this.modalData.content = null;
    this.modalData.buttonText = null;
    this.modalData.funcCall = this.hideModal.bind(this);
  }

  public async preBuyCashBoxToken() {
    const CashBoxC = this.contractData.CashboxC;
    const cashDecimals = await CashBoxC.cashDecimals();

    let amountInDec = tokenToDecimals(this.userInput.buyCashbox.amt, cashDecimals);

    const contractCashValuation = await CashBoxC.contractCashValuation();
    const cashValuationCap = await CashBoxC.cashValauationCap();

    // set default action
    this.modalData.content = `You will receive ${this.userInput.buyCashbox.amt} CashBox Tokens for depositing ${this.userInput.buyCashbox.amt} ${this.contractData.cashTokenSymbol}`;
    this.modalData.buttonText = 'Buy';
    this.modalData.funcCall = this.buyCashBoxToken.bind(this);

    // handle specific cases
    if (parseFloat(cashValuationCap) > 0) {
      if (parseFloat(contractCashValuation) + parseFloat(amountInDec) > parseFloat(cashValuationCap)) {
        this.modalData.buttonText = 'OK';
        this.modalData.funcCall = this.hideModal.bind(this);

        let cashBoxPurchasable: any = parseFloat(cashValuationCap) - parseFloat(contractCashValuation);
        cashBoxPurchasable = decimalsToToken(cashBoxPurchasable, cashDecimals);

        if (parseFloat(cashBoxPurchasable) > 0) {
          this.modalData.content = `Maximum purchase possible is ${cashBoxPurchasable}`;

        } else if (parseFloat(cashBoxPurchasable) === 0) {
          this.modalData.content = `CashBox is Full, No More Deposits!`;
        }
      }
    }
    $('#cashboxModal').modal('show');
  }

  public async buyCashBoxToken() {
    const CashBoxC = this.contractData.CashboxC;
    const cashDecimals = await CashBoxC.cashDecimals();

    let amountInDec = tokenToDecimals(this.userInput.buyCashbox.amt, cashDecimals);

    const cashAddress = this.contractData.cashTokenAddress;
    const CashC = this.initContract(cashAddress, ERC20Detailed.abi);
    const allowance = await CashC.allowance(this.userAddress, CashBoxC.address);

    if (parseFloat(allowance) < parseFloat(amountInDec)) {

      const tx = await CashC.approve(CashBoxC.address, amountInDec);
      await this.web3.waitForTransaction(tx.hash);
    }

    const tx = await CashBoxC.mintPoolToken(amountInDec);
    await this.web3.waitForTransaction(tx.hash);

    this.fetchBalances();
    this.hideModal();
    this.userInput.buyCashbox.amt = 0;
  }

  public async preBurnCashBoxToken() {
    let input = this.userInput.burnCashbox.amt;
    const CashBoxC = this.contractData.CashboxC;
    let contractStockTokenBalance = await CashBoxC.contractStockTokenBalance();
    contractStockTokenBalance = decimalsToToken(contractStockTokenBalance, this.contractData.assetTokenDecimals);
    let stockToCashRate = await CashBoxC.stockToCashRate();
    // const stockTokenMultiplier = await CashBoxC.stockTokenMultiplier();
    // stockToCashRate = parseFloat(stockToCashRate) / parseFloat(stockTokenMultiplier);
    stockToCashRate = decimalsToToken(stockToCashRate, this.contractData.cashTokenDecimals);

    const stockValuation = parseFloat(contractStockTokenBalance) * parseFloat(stockToCashRate);

    if (input <= stockValuation) {
      this.modalData.content = `You should receive ${input / stockToCashRate} ${this.contractData.assetTokenSymbol}`;
    } else {
      this.modalData.content = `You should receive ${contractStockTokenBalance} ${this.contractData.assetTokenSymbol} 
      and ${input - stockValuation} ${this.contractData.cashTokenSymbol}`;
    }
    this.modalData.buttonText = 'Redeem';
    this.modalData.funcCall = this.burnCashBoxToken.bind(this);

    $('#cashboxModal').modal('show');
  }

  public async burnCashBoxToken() {
    const CashBoxC = this.contractData.CashboxC;

    let amountInDec = tokenToDecimals(this.userInput.burnCashbox.amt, this.contractData.cashboxTokenDecimals);

    const tx = await CashBoxC.burnPoolToken(amountInDec);
    await this.web3.waitForTransaction(tx.hash);

    this.fetchBalances();
    this.hideModal();
    this.userInput.burnCashbox.amt = 0;
  }

  public async preRedeemAssetToken() {
    const input = this.userInput.redeemAssetToken.amt;
    const CashBoxC = this.contractData.CashboxC;

    let stockToCashRate = await CashBoxC.stockToCashRate();
    // const stockTokenMultiplier = await CashBoxC.stockTokenMultiplier();
    // stockToCashRate = parseFloat(stockToCashRate) / parseFloat(stockTokenMultiplier);
    stockToCashRate = decimalsToToken(stockToCashRate, this.contractData.cashTokenDecimals);

    let contractCashBalance = await CashBoxC.contractCashBalance();
    contractCashBalance = decimalsToToken(contractCashBalance, this.contractData.cashTokenDecimals);

    const redeemValue = input * stockToCashRate;

    if (redeemValue > contractCashBalance) {
      this.modalData.content = `CashBox does not have enough liquidity. Please reduce the amount.`;
      this.modalData.buttonText = 'OK';
      this.modalData.funcCall = this.hideModal.bind(this);
    } else {
      this.modalData.content = `Yoy will receive ${redeemValue} ${this.contractData.cashTokenSymbol} for ${input} ${this.contractData.assetTokenSymbol}`;
      this.modalData.buttonText = 'Sell';
      this.modalData.funcCall = this.redeemAssetToken.bind(this);
    }
    $('#cashboxModal').modal('show');
  }

  public async redeemAssetToken() {
    const CashBoxC = this.contractData.CashboxC;

    let amountInDec = tokenToDecimals(this.userInput.redeemAssetToken.amt, this.contractData.assetTokenDecimals);

    const assetAddress = this.contractData.assetTokenAddress;
    const AssetTokenC = this.initContract(assetAddress, ERC20Detailed.abi);
    const allowance = await AssetTokenC.allowance(this.userAddress, CashBoxC.address);

    if (parseFloat(allowance) < parseFloat(amountInDec)) {

      const tx = await AssetTokenC.approve(CashBoxC.address, amountInDec);
      await this.web3.waitForTransaction(tx.hash);
    }

    const tx = await CashBoxC.redeemStockToken(amountInDec);
    await this.web3.waitForTransaction(tx.hash);

    this.fetchBalances();
    this.hideModal();
    this.userInput.redeemAssetToken.amt = 0;
  }

  private async approveErc20(tokenAddr, amount) {
    const TokenC = this.initContract(tokenAddr, ERC20Detailed.abi);
    const tx = await TokenC.approve(this.contractData.CashboxC.address, amount);
    await this.web3.waitForTransaction(tx.hash);
  }

  public async approveInfiniteCash() {
    const infiniteAllowance = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    await this.approveErc20(this.contractData.cashTokenAddress, infiniteAllowance);
    this.contractData.cashEnabled = true;
  }

  public async approveInfiniteAsset() {
    const infiniteAllowance = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    await this.approveErc20(this.contractData.assetTokenAddress, infiniteAllowance);
    this.contractData.assetEnabled = true;
  }

}
