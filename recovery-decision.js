export function recoveryDecision(context,args,run,now=Date.now()){
 if(!context?.id||args.recoveryId!==context.id)throw Error('恢复批次已变化，请重新读取当前处境');
 if(typeof args.analysis!=='string'||!args.analysis.trim()||args.analysis.length>4000)throw Error('请说明中断前后变化及当前决定');
 if(!Number.isSafeInteger(args.reconsiderAt)||args.reconsiderAt<=now||args.reconsiderAt>now+7*86400000)throw Error('下一次考虑时间须在现在之后的七天内');
 return {recoveryId:context.id,run,at:now,analysis:args.analysis.trim(),reconsiderAt:args.reconsiderAt,status:'reviewed'};
}
