generate_protos:
	mkdir -p ./src/generated && \
	protoc --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
       --ts_proto_out=./src/generated \
       --ts_proto_opt=esModuleInterop=true \
       --ts_proto_opt=importSuffix=.js \
       --proto_path= ./protos/data.proto \
       --proto_path= ./protos/validation_status.proto \
       --proto_path= ./protos/kyc_item.proto
